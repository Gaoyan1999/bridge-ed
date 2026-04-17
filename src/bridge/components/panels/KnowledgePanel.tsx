import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  LearningCardBackend,
  LearningCardStudentFeedback,
  LearningCardStudentFinishedType,
  LearningCardStudentLearningStatus,
} from '@/data/entity/learning-card-backend';
import type { QuizBackend, QuizQuestion } from '@/data/entity/quiz-backend';

type StudentLearningStatusKey = LearningCardStudentLearningStatus;

type KnowledgeInboxRow = {
  id: string;
  title: string;
  subject: string;
  date: string;
  studentLearningStatus?: StudentLearningStatusKey;
  studentFinishedType?: LearningCardStudentFinishedType;
};

/** Text of the AI reply right after a `/make-quiz` user message; otherwise last assistant message. */
function findLastQuizReplyText(msgs: ThreadMessage[]): string {
  for (let i = msgs.length - 2; i >= 0; i--) {
    const cur = msgs[i];
    const cmd = cur?.type === 'out' ? cur.text?.trim() : '';
    if (cmd === '/make-quiz' || cmd === '/quiz') {
      const next = msgs[i + 1];
      if (next?.type === 'in') return next.text ?? '';
    }
  }
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i]?.type === 'in') return msgs[i]?.text ?? '';
  }
  return '';
}

type QuizWorksheetBannerState = {
  threadId: string;
  phase: 'offer' | 'generating' | 'done';
};

import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, ImagePlus, Sparkles, X } from 'lucide-react';
import { useBridge } from '@/bridge/BridgeContext';
import { panelHintsForRole } from '@/bridge/panelHints';
import { DEMO_PARENT_USER_ID } from '@/bridge/mockData';
import type { TFunction } from 'i18next';
import {
  isParentFacingTonightPreset,
  isStudentFacingTonightPreset,
  type LearningCardItem,
  type LearningCardTonightActionPreset,
  type ThreadMessage,
} from '@/bridge/types';
import { LearningCardParentKnowledgeView } from '@/bridge/components/LearningCardParentPanel';
import { KnowledgeChildDiscovery } from '@/bridge/components/KnowledgeChildDiscovery';
import { Markdown } from '@/bridge/components/Markdown';
import { MessageAttachmentGrid } from '@/bridge/components/MessageAttachmentGrid';
import { KnowledgeParentEmptyExample } from '@/bridge/components/KnowledgeParentEmptyExample';
import { KnowledgeStudentQuizBlock } from '@/bridge/components/KnowledgeStudentQuizBlock';
import { Button } from '@/bridge/components/ui/Button';
import { Composer } from '@/bridge/components/ui/Composer';
import { PanelHeader } from '@/bridge/components/ui/PanelHeader';
import { StudentChallengeFeedbackModal } from '@/bridge/components/ui/StudentChallengeFeedbackModal';
import { cx } from '@/bridge/cx';
import { getDataLayer, resolveParentSummaryFromParts, uiLangFromI18n } from '@/data';
import { getLlmApi } from '@/data/api/llm-api';
import {
  aggregateChildrenLearningStatus,
  getParentFeedbackForUser,
  getStudentFeedbackForUser,
  learningCardBackendToItem,
  relevantChildStudentIdsForParent,
  studentActionClearPatchForTonightPreset,
  studentActionPatchForTonightPreset,
  upsertParentFeedbackOnCard,
  upsertStudentFeedbackOnCard,
} from '@/data/learning-card-mappers';
import { MAX_MESSAGE_IMAGES, usePendingImageAttachments } from '@/bridge/usePendingImageAttachments';

/**
 * Subject line from `learningCardBackendToItem` is often `G9 路 Math` 鈥?show subject-focused text (drop grade when present).
 */
function knowledgeLabelsFromCard(card: Pick<LearningCardItem, 'subject'>): {
  key: string;
  kind: 'subject';
  text: string;
}[] {
  const out: { key: string; kind: 'subject'; text: string }[] = [];
  const line = card.subject.trim();
  if (line) {
    const parts = line
      .split(' 路 ')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length <= 1) {
      out.push({ key: 'subject', kind: 'subject', text: parts[0] ?? line });
    } else {
      const [first, ...rest] = parts;
      const gradeLike = Boolean(first && /^G\d+/i.test(first));
      const subjectText = gradeLike && rest.length ? rest.join(' 路 ') : line;
      out.push({ key: 'subject', kind: 'subject', text: subjectText });
    }
  }
  return out;
}

function knowledgeTonightSlashCommand(preset: LearningCardTonightActionPreset): string {
  if (preset === 'quiz') return '/make-quiz';
  if (preset === 'parent_led_practice') return '/practice';
  return '/teach-back';
}

const KNOWLEDGE_EVAL_QUIZ_CMD = '/eval-quiz';

function knowledgeTonightActionLabel(preset: LearningCardTonightActionPreset, t: TFunction): string {
  if (preset === 'parent_led_practice') return t('knowledge.practice.button');
  return t(`knowledge.taskShort.${preset}`);
}

/** Inbox rows keep subject + status on opposite ends; thread header shows subject tags only (status stays in the list). */
function KnowledgeCardLabels({
  card,
  studentLearningStatus,
  studentFinishedType,
  layout = 'inbox',
}: {
  card: Pick<LearningCardItem, 'subject'>;
  studentLearningStatus?: StudentLearningStatusKey;
  studentFinishedType?: LearningCardStudentFinishedType;
  layout?: 'inbox' | 'thread';
}) {
  const { t } = useTranslation();
  const tags = knowledgeLabelsFromCard(card).map((row) => ({
    ...row,
    aria: t('common.subject'),
  }));
  const showProgress = studentLearningStatus != null;
  /** List sidebar shows TODO/DOING/DONE; thread title row only shows subject tags (status is on the right / in list). */
  const showStatusChip = showProgress && layout === 'inbox';
  const splitForInbox = layout === 'inbox' && showStatusChip;
  const statusLine =
    studentLearningStatus === 'not_started'
      ? t('knowledge.lcProgressShort.todo')
      : studentLearningStatus === 'learning'
        ? t('knowledge.lcProgressShort.doing')
        : studentLearningStatus === 'finished'
          ? t('knowledge.lcProgressShort.done')
          : '';
  const statusTitle =
    studentLearningStatus === 'finished' && studentFinishedType
      ? `${t('knowledge.lcStatus')}: ${t('knowledge.lcProgressShort.done')} (${t(`knowledge.studentFinishedType.${studentFinishedType}`)})`
      : studentLearningStatus != null
        ? `${t('knowledge.lcStatus')}: ${statusLine}`
        : '';
  if (!tags.length && !showStatusChip) return null;
  return (
    <div
      className={cx(
        'knowledge-inbox__labels',
        splitForInbox && 'knowledge-inbox__labels--split',
      )}
      role="group"
      aria-label={showStatusChip ? t('knowledge.ariaInboxLabels') : t('common.subject')}
    >
      <div className="knowledge-inbox__labels-left">
        {tags.map((row) => (
          <span
            key={row.key}
            className={cx('knowledge-inbox__label', 'knowledge-inbox__label--subject')}
            title={`${row.aria}: ${row.text}`}
          >
            <span className="visually-hidden">
              {row.aria}:{' '}
            </span>
            {row.text}
          </span>
        ))}
      </div>
      {showStatusChip ? (
        <span
          className={cx(
            'knowledge-inbox__label',
            'knowledge-inbox__label--status',
            'knowledge-inbox__label--rect',
            studentLearningStatus === 'not_started' && 'knowledge-inbox__label--student-not-started',
            studentLearningStatus === 'learning' && 'knowledge-inbox__label--student-learning',
            studentLearningStatus === 'finished' && 'knowledge-inbox__label--student-finished',
          )}
          title={statusTitle}
        >
          <span className="visually-hidden">
            {t('knowledge.lcStatus')}:{' '}
          </span>
          {statusLine}
        </span>
      ) : null}
    </div>
  );
}

function StudentLearningFinishRow({
  threadId,
  studentFeedback,
  choicesLocked,
  onFinishEasy,
  onFinishThink,
  onOpenSkipFeedback,
  onChangeMind,
  t,
}: {
  threadId: string | undefined;
  studentFeedback: LearningCardStudentFeedback;
  choicesLocked?: boolean;
  onFinishEasy: () => void;
  onFinishThink: () => void;
  onOpenSkipFeedback: () => void;
  onChangeMind: () => void;
  t: TFunction;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const finished = studentFeedback.status === 'finished';
  const ft = studentFeedback.finishedType;
  const busy = !threadId;
  const lock = busy || finished || Boolean(choicesLocked);
  const canOpenMenu = !finished && !busy && !choicesLocked;

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (lock) setMenuOpen(false);
  }, [lock]);

  const closeAnd = (fn: () => void) => {
    setMenuOpen(false);
    fn();
  };

  const triggerLabel = finished && ft ? t(`knowledge.studentFinishedType.${ft}`) : t('knowledge.done');

  return (
    <div className="knowledge-lc-finish-wrap" role="group" aria-label={t('knowledge.ariaFinishChoices')}>
      {finished ? (
        <button type="button" className="knowledge-lc-finish-change" onClick={onChangeMind}>
          {t('knowledge.finishChange')}
        </button>
      ) : null}
      <div ref={wrapRef} className="knowledge-lc-finish-dropdown">
        <Button
          id="knowledge-lc-finish-trigger"
          type="button"
          variant="secondary"
          pill
          sm
          className={cx(
            'knowledge-lc-finish-done-trigger',
            finished && 'knowledge-lc-finish-done-trigger--finished',
            finished &&
              ft &&
              cx(
                'knowledge-lc-finish-done-trigger--result',
                ft === 'pretty_easy' && 'knowledge-lc-finish-done-trigger--result-easy',
                ft === 'think_get_it' && 'knowledge-lc-finish-done-trigger--result-think',
                ft === 'challenge' && 'knowledge-lc-finish-done-trigger--result-challenge',
              ),
          )}
          disabled={busy || finished || Boolean(choicesLocked)}
          aria-expanded={canOpenMenu ? menuOpen : undefined}
          aria-haspopup={canOpenMenu ? 'menu' : undefined}
          aria-controls={canOpenMenu ? 'knowledge-lc-finish-menu' : undefined}
          onClick={() => {
            if (!canOpenMenu) return;
            setMenuOpen((o) => !o);
          }}
        >
          {!finished ? (
            <span className="knowledge-lc-finish-done-trigger__icon" aria-hidden>
              <Check className="knowledge-lc-finish-done-trigger__check" strokeWidth={2.5} size={18} />
            </span>
          ) : null}
          <span className={cx('knowledge-lc-finish-done-trigger__label', !finished && 'sr-only')}>
            {triggerLabel}
          </span>
          {canOpenMenu ? (
            <ChevronDown
              className={cx('knowledge-lc-finish-done-chevron', menuOpen && 'is-open')}
              strokeWidth={2}
              size={14}
              aria-hidden
            />
          ) : null}
        </Button>
        {canOpenMenu && menuOpen ? (
          <div
            id="knowledge-lc-finish-menu"
            role="menu"
            className="knowledge-lc-finish-menu"
            aria-labelledby="knowledge-lc-finish-trigger"
          >
            <button
              type="button"
              role="menuitem"
              className="knowledge-lc-finish-menu__item knowledge-lc-finish-menu__item--easy"
              onClick={() => closeAnd(onFinishEasy)}
            >
              {t('knowledge.studentFinishedType.pretty_easy')}
            </button>
            <button
              type="button"
              role="menuitem"
              className="knowledge-lc-finish-menu__item knowledge-lc-finish-menu__item--think"
              onClick={() => closeAnd(onFinishThink)}
            >
              {t('knowledge.studentFinishedType.think_get_it')}
            </button>
            <button
              type="button"
              role="menuitem"
              className="knowledge-lc-finish-menu__item knowledge-lc-finish-menu__item--skip"
              onClick={() => closeAnd(onOpenSkipFeedback)}
            >
              {t('knowledge.studentFinishedType.challenge')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function msgWhoLabel(who: string, tf: (k: string) => string): string {
  if (who === 'You') return tf('common.you');
  if (who === 'BridgeEd AI') return tf('common.bridgedAi');
  return who;
}

export function KnowledgePanel({ active }: { active: boolean }) {
  const { t, i18n } = useTranslation();
  const {
    role,
    learningCardsEpoch,
    knowledgeThreads,
    selectedKnowledgeThreadId,
    setSelectedKnowledgeThreadId,
    appendKnowledgeMessage,
    seedKnowledgeThreadIfEmpty,
    currentUser,
    bumpLearningCards,
  } = useBridge();
  const hints = panelHintsForRole(t, role);
  const [input, setInput] = useState('');
  const [tonightActionBusy, setTonightActionBusy] = useState(false);
  const [streamingReply, setStreamingReply] = useState('');
  const [streamingThreadId, setStreamingThreadId] = useState<string | null>(null);
  const [challengeFeedbackOpen, setChallengeFeedbackOpen] = useState(false);
  /** Parent: after Quiz action completes — offer → generating worksheet → done (banner stays). */
  const [quizWorksheetBanner, setQuizWorksheetBanner] = useState<QuizWorksheetBannerState | null>(null);
  const [cardBackends, setCardBackends] = useState<LearningCardBackend[]>([]);
  const cardBackendsRef = useRef(cardBackends);
  cardBackendsRef.current = cardBackends;

  const cards = useMemo(() => cardBackends.map(learningCardBackendToItem), [cardBackends]);
  const knowledgeFileInputRef = useRef<HTMLInputElement>(null);
  const knowledgeThreadEndRef = useRef<HTMLDivElement>(null);
  const { pending, addFromFileList, remove, clear } = usePendingImageAttachments({
    onReject: (reason) => {
      if (reason === 'size') window.alert(t('common.imageTooLarge'));
      else if (reason === 'max') window.alert(t('common.maxImages', { count: MAX_MESSAGE_IMAGES }));
      else if (reason === 'type') window.alert(t('common.imagesOnly'));
    },
  });

  const canUseKnowledge = role === 'parent' || role === 'student';
  const parentUserId = currentUser?.role === 'parent' ? currentUser.id : DEMO_PARENT_USER_ID;
  const studentUserId = currentUser?.role === 'student' ? (currentUser?.id ?? '').trim() : '';
  const parentChildrenIds = useMemo(() => {
    if (role !== 'parent') return [];
    return (currentUser?.children ?? []).map((id) => id.trim()).filter(Boolean);
  }, [role, currentUser?.children]);

  useEffect(() => {
    if (!canUseKnowledge) {
      setCardBackends([]);
      return;
    }
    const studentId = role === 'student' ? (currentUser?.id ?? '').trim() : '';
    if (role === 'student' && !studentId) {
      setCardBackends([]);
      return;
    }
    let cancelled = false;
    const load =
      role === 'parent'
        ? getDataLayer().learningCards.listForParentUser(parentUserId)
        : getDataLayer().learningCards.listForStudentUser(studentId);

    void load
      .then((rows) => {
        if (!cancelled) setCardBackends(rows);
      })
      .catch(() => {
        if (!cancelled) setCardBackends([]);
      });
    return () => {
      cancelled = true;
    };
  }, [learningCardsEpoch, canUseKnowledge, role, parentUserId, currentUser?.id]);

  const items = useMemo((): KnowledgeInboxRow[] => {
    return cards.map((c) => {
      const row: KnowledgeInboxRow = {
        id: c.threadId,
        title: c.title,
        subject: c.subject,
        date: new Date(c.at).toISOString().slice(0, 10),
      };
      if (role === 'student' && studentUserId) {
        const b = cardBackends.find((x) => x.threadId === c.threadId);
        if (b) {
          const fb = getStudentFeedbackForUser(b, studentUserId);
          row.studentLearningStatus = fb.status;
          if (fb.status === 'finished' && fb.finishedType) {
            row.studentFinishedType = fb.finishedType;
          }
        }
      }
      if (role === 'parent' && parentChildrenIds.length > 0) {
        const b = cardBackends.find((x) => x.threadId === c.threadId);
        if (b) {
          const ids = relevantChildStudentIdsForParent(b, parentChildrenIds);
          const agg = aggregateChildrenLearningStatus(b, ids);
          if (agg != null) {
            row.studentLearningStatus = agg;
          }
        }
      }
      return row;
    });
  }, [cards, cardBackends, role, studentUserId, parentChildrenIds]);

  useEffect(() => {
    if (!cards.length) {
      setSelectedKnowledgeThreadId(null);
      return;
    }
    const ids = cards.map((c) => c.threadId);
    setSelectedKnowledgeThreadId((cur) => (cur && ids.includes(cur) ? cur : ids[0]!));
  }, [cards, setSelectedKnowledgeThreadId]);

  const threadId =
    selectedKnowledgeThreadId && items.some((i) => i.id === selectedKnowledgeThreadId)
      ? selectedKnowledgeThreadId
      : items[0]?.id;
  const current = items.find((i) => i.id === threadId);
  const currentCard = threadId ? cards.find((c) => c.threadId === threadId) : undefined;
  const currentBackend = threadId ? cardBackends.find((c) => c.threadId === threadId) : undefined;
  const studentFeedback =
    role === 'student' && currentBackend && studentUserId
      ? getStudentFeedbackForUser(currentBackend, studentUserId)
      : null;

  const parentFeedback =
    role === 'parent' && currentBackend ? getParentFeedbackForUser(currentBackend, parentUserId) : null;

  const persistStudentPatch = useCallback(
    async (patch: Partial<Omit<LearningCardStudentFeedback, 'studentId'>>) => {
      if (role !== 'student' || !studentUserId || !threadId) return;
      const b = cardBackendsRef.current.find((c) => c.threadId === threadId);
      if (!b) return;
      const updated = upsertStudentFeedbackOnCard(b, { studentId: studentUserId, ...patch });
      await getDataLayer().learningCards.put(updated);
      setCardBackends((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      bumpLearningCards();
    },
    [role, studentUserId, threadId, bumpLearningCards],
  );

  const persistParentDoNotUnderstand = useCallback(async () => {
    if (role !== 'parent' || !parentUserId || !threadId) return;
    const b = cardBackendsRef.current.find((c) => c.threadId === threadId);
    if (!b) return;
    const updated = upsertParentFeedbackOnCard(b, { parentId: parentUserId, doNotUnderstand: true });
    await getDataLayer().learningCards.put(updated);
    setCardBackends((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    bumpLearningCards();
    const prompt = t('knowledge.parentDoNotUnderstandPrompt');
    setInput(prompt);
    requestAnimationFrame(() => {
      document.getElementById('knowledge-input')?.focus();
    });
  }, [role, parentUserId, threadId, bumpLearningCards, t]);

  const persistParentTonightDone = useCallback(
    async (preset: LearningCardTonightActionPreset) => {
      if (role !== 'parent' || !parentUserId || !threadId) return;
      const b = cardBackendsRef.current.find((c) => c.threadId === threadId);
      if (!b) return;
      const fb = getParentFeedbackForUser(b, parentUserId);
      const cur = new Set(fb.tonightActionsDone ?? []);
      const markingDone = !cur.has(preset);
      if (markingDone) cur.add(preset);
      else cur.delete(preset);
      let updated = upsertParentFeedbackOnCard(b, {
        parentId: parentUserId,
        tonightActionsDone: Array.from(cur),
      });
      const ids = relevantChildStudentIdsForParent(updated, parentChildrenIds);
      if (ids.length > 0) {
        const actionPatch = markingDone
          ? studentActionPatchForTonightPreset(preset)
          : studentActionClearPatchForTonightPreset(preset);
        for (const sid of ids) {
          updated = upsertStudentFeedbackOnCard(updated, {
            studentId: sid,
            ...actionPatch,
          });
        }
      }
      await getDataLayer().learningCards.put(updated);
      setCardBackends((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      bumpLearningCards();
    },
    [role, parentUserId, threadId, bumpLearningCards, parentChildrenIds],
  );

  /** Parent chat → linked children: `chatedWithAI` + optional `learning` status (`action*` flags follow Tonight's todo toggles). */
  const persistParentEngagementToChildren = useCallback(async () => {
    if (role !== 'parent' || !threadId || parentChildrenIds.length === 0) return;
    const b = cardBackendsRef.current.find((c) => c.threadId === threadId);
    if (!b) return;
    const ids = relevantChildStudentIdsForParent(b, parentChildrenIds);
    if (ids.length === 0) return;
    let updated = b;
    for (const sid of ids) {
      const sfb = getStudentFeedbackForUser(updated, sid);
      updated = upsertStudentFeedbackOnCard(updated, {
        studentId: sid,
        chatedWithAI: true,
        ...(sfb.status === 'not_started' ? { status: 'learning' as const } : {}),
      });
    }
    await getDataLayer().learningCards.put(updated);
    setCardBackends((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    bumpLearningCards();
  }, [role, threadId, parentChildrenIds, bumpLearningCards]);

  const finishCardEasy = useCallback(() => {
    void persistStudentPatch({ status: 'finished', finishedType: 'pretty_easy', feeling: undefined });
  }, [persistStudentPatch]);

  const finishCardThink = useCallback(() => {
    void persistStudentPatch({ status: 'finished', finishedType: 'think_get_it', feeling: undefined });
  }, [persistStudentPatch]);

  const reopenCardLearning = useCallback(() => {
    void persistStudentPatch({ status: 'learning', finishedType: undefined, feeling: undefined });
  }, [persistStudentPatch]);

  /** Teacher-included presets. Parent summary todo list includes teach-back when selected; composer pills omit it. */
  const includedSteps = useMemo(
    () => currentCard?.tonightActions.filter((a) => a.include) ?? [],
    [currentCard],
  );
  const composerTonightSteps = useMemo(() => {
    if (role === 'parent') {
      return includedSteps.filter((a) => isParentFacingTonightPreset(a.preset));
    }
    if (role === 'student') {
      return includedSteps.filter((a) => isStudentFacingTonightPreset(a.preset));
    }
    return includedSteps;
  }, [role, includedSteps]);
  const msgs = threadId ? knowledgeThreads[threadId] ?? [] : [];
  const buildCardContext = useCallback(
    (historyRows: Array<{ who: string; type: 'in' | 'out'; text: string }>) => {
      if (!currentCard || !currentBackend) return undefined;
      const userTurns = historyRows.filter((m) => m.type === 'out').length;
      return {
        topic: currentBackend.topic || currentCard.title,
        grade: currentBackend.grade || '',
        subject: currentBackend.subject || currentCard.subject,
        teacherNotes: currentBackend.teacherNotes || '',
        classLessonTitle: currentBackend.classLessonTitle || '',
        parentSummary: currentBackend.parentSummary || currentCard.summary || '',
        tonightActions: (currentBackend.tonightActions || []).map((a) => ({
          preset: a.preset,
          include: a.include,
          text: a.text || '',
        })),
        isFirstExplanation: userTurns === 0,
      };
    },
    [currentCard, currentBackend],
  );

  useEffect(() => {
    setChallengeFeedbackOpen(false);
  }, [threadId]);

  useEffect(() => {
    setQuizWorksheetBanner(null);
  }, [threadId]);

  useEffect(() => {
    if (!active || !threadId) return;
    const card = cards.find((c) => c.threadId === threadId);
    if (!card) return;
    seedKnowledgeThreadIfEmpty(card);
  }, [active, threadId, cards, seedKnowledgeThreadIfEmpty]);

  const send = () => {
    if (tonightActionBusy || (threadId != null && streamingThreadId === threadId)) return;
    const v = input.trim();
    const apiMessage = v || (pending.length > 0 ? '[Image attachment]' : '');
    if (!apiMessage && !threadId) return;
    const isMakeQuiz = /^\/?(?:make-quiz|quiz)(\b|$)/i.test(apiMessage);
    const baseHistory = isMakeQuiz ? msgs : msgs.slice(-12);
    const history = baseHistory.map((m) => ({
      who: m.who,
      type: m.type,
      text: m.text,
    }));
    const roleForApi = role === 'teacher' ? 'parent' : role;
    const doReply = async () => {
      if (!threadId || !apiMessage) return;
      setStreamingThreadId(threadId);
      setStreamingReply('');
      try {
        const api = getLlmApi();
        const result = await api.knowledgeChatRespondStream(
          {
            role: roleForApi,
            uiLang: uiLangFromI18n(i18n.resolvedLanguage ?? i18n.language ?? 'en'),
            threadId,
            threadTitle: currentCard?.title ?? '',
            message: apiMessage,
            history,
            cardContext: buildCardContext(history),
          },
          {
            onDelta: (delta) => {
              setStreamingReply((prev) => prev + delta);
            },
          },
        );
        appendKnowledgeMessage(threadId, {
          who: 'BridgeEd AI',
          type: 'in',
          text: result.reply,
        });
      } catch (e) {
        appendKnowledgeMessage(threadId, {
          who: 'BridgeEd AI',
          type: 'in',
          text: e instanceof Error ? e.message : 'Chat response failed.',
        });
      } finally {
        setStreamingReply('');
        setStreamingThreadId(null);
      }
    };

    const attachments =
      pending.length > 0
        ? pending.map((p) => ({ kind: 'image' as const, url: p.dataUrl, name: p.name }))
        : undefined;
    if ((!v && !attachments?.length) || !threadId) return;
    appendKnowledgeMessage(threadId, {
      who: 'You',
      type: 'out',
      text: v,
      ...(attachments ? { attachments } : {}),
    });
    setInput('');
    clear();
    if (knowledgeFileInputRef.current) knowledgeFileInputRef.current.value = '';
    if (role === 'student' && threadId && studentUserId) {
      const b = cardBackendsRef.current.find((c) => c.threadId === threadId);
      const fb = b ? getStudentFeedbackForUser(b, studentUserId) : null;
      void persistStudentPatch({
        chatedWithAI: true,
        ...(fb?.status === 'not_started' ? { status: 'learning' as const } : {}),
      });
    }
    void doReply();
    if (role === 'parent') {
      void persistParentEngagementToChildren();
    }
  };

  const runTonightActionFlow = useCallback(
    async (preset: LearningCardTonightActionPreset) => {
      if (!threadId || tonightActionBusy) return;
      setTonightActionBusy(true);
      const cmd = knowledgeTonightSlashCommand(preset);
      appendKnowledgeMessage(threadId, { who: 'You', type: 'out', text: cmd });
      if (role === 'student' && studentUserId) {
        const b = cardBackendsRef.current.find((c) => c.threadId === threadId);
        const fb = b ? getStudentFeedbackForUser(b, studentUserId) : null;
        void persistStudentPatch({
          chatedWithAI: true,
          ...(fb?.status === 'not_started' ? { status: 'learning' as const } : {}),
          ...studentActionPatchForTonightPreset(preset),
        });
      }
      if (role === 'parent') {
        void persistParentEngagementToChildren();
      }
      const api = getLlmApi();
      const title = currentCard?.title;
      const isMakeQuiz = /^\/?(?:make-quiz|quiz)(\b|$)/i.test(cmd);
      const baseHistory = isMakeQuiz ? msgs : msgs.slice(-12);
      const history = baseHistory.map((m) => ({
        who: m.who,
        type: m.type,
        text: m.text,
      }));
      const roleForApi = role === 'teacher' ? 'parent' : role;
      try {
        setStreamingThreadId(threadId);
        setStreamingReply('');
        const result = await api.knowledgeChatRespondStream(
          {
            role: roleForApi,
            uiLang: uiLangFromI18n(i18n.resolvedLanguage ?? i18n.language ?? 'en'),
            threadId,
            threadTitle: title ?? '',
            message: cmd,
            history,
            cardContext: buildCardContext(history),
          },
          {
            onDelta: (delta) => {
              setStreamingReply((prev) => prev + delta);
            },
          },
        );
        appendKnowledgeMessage(threadId, {
          who: 'BridgeEd AI',
          type: 'in',
          text: result.reply,
        });
        if (role === 'parent' && preset === 'quiz') {
          setQuizWorksheetBanner({ threadId, phase: 'offer' });
        }
      } catch (e) {
        appendKnowledgeMessage(threadId, {
          who: 'BridgeEd AI',
          type: 'in',
          text: e instanceof Error ? e.message : 'Knowledge tonight command failed.',
        });
      } finally {
        setStreamingReply('');
        setStreamingThreadId(null);
        setTonightActionBusy(false);
      }
    },
    [
      threadId,
      tonightActionBusy,
      appendKnowledgeMessage,
      buildCardContext,
      currentCard?.title,
      role,
      persistStudentPatch,
      persistParentEngagementToChildren,
      studentUserId,
      i18n.language,
      i18n.resolvedLanguage,
    ],
  );

  const runEvalQuizAfterWorksheet = useCallback(
    async (savedQuiz: QuizBackend) => {
      if (!threadId) return;
      setTonightActionBusy(true);
      appendKnowledgeMessage(threadId, { who: 'You', type: 'out', text: KNOWLEDGE_EVAL_QUIZ_CMD });
      if (role === 'student' && studentUserId) {
        const b = cardBackendsRef.current.find((c) => c.threadId === threadId);
        const fb = b ? getStudentFeedbackForUser(b, studentUserId) : null;
        void persistStudentPatch({
          chatedWithAI: true,
          ...(fb?.status === 'not_started' ? { status: 'learning' as const } : {}),
        });
      }
      try {
        setStreamingThreadId(threadId);
        setStreamingReply('');
        const api = getLlmApi();
        const result = await api.evalQuiz({
          questions: savedQuiz.questions.map((q) => ({ ...q })),
          uiLang: uiLangFromI18n(i18n.resolvedLanguage ?? i18n.language ?? 'en'),
        });
        appendKnowledgeMessage(threadId, {
          who: 'BridgeEd AI',
          type: 'in',
          text: result.reply,
        });
      } catch (e) {
        appendKnowledgeMessage(threadId, {
          who: 'BridgeEd AI',
          type: 'in',
          text: e instanceof Error ? e.message : t('knowledge.evalQuizFailed'),
        });
      } finally {
        setStreamingReply('');
        setStreamingThreadId(null);
        setTonightActionBusy(false);
      }
    },
    [
      threadId,
      appendKnowledgeMessage,
      role,
      studentUserId,
      persistStudentPatch,
      t,
      i18n.language,
      i18n.resolvedLanguage,
    ],
  );

  const threadMsgCount = threadId ? (knowledgeThreads[threadId]?.length ?? 0) : 0;
  const showAiAnalyzing = streamingThreadId === threadId && streamingReply.trim().length === 0;

  useLayoutEffect(() => {
    if (!active || !canUseKnowledge) return;
    knowledgeThreadEndRef.current?.scrollIntoView({ block: 'end' });
  }, [
    active,
    canUseKnowledge,
    threadId,
    threadMsgCount,
    streamingReply,
    showAiAnalyzing,
    quizWorksheetBanner,
  ]);

  const dismissQuizWorksheetOffer = useCallback(() => {
    setQuizWorksheetBanner(null);
  }, []);

  const confirmQuizWorksheetOffer = useCallback(() => {
    if (!threadId) return;
    setQuizWorksheetBanner((b) => {
      if (b?.threadId !== threadId || b.phase !== 'offer') return b;
      return { threadId, phase: 'generating' };
    });

    void (async () => {
      try {
        const quizText = findLastQuizReplyText(msgs);
        const api = getLlmApi();
        const result = await api.knowledgeGenerateStructuredQuiz(quizText);
        const structuredPayloadJson = JSON.stringify(result);
        const dl = getDataLayer();
        const pid = parentUserId.trim();
        const childIds = parentChildrenIds.length > 0 ? parentChildrenIds : [''];
        const createdAt = new Date().toISOString();
        const questions: QuizQuestion[] = result.questions.map((q) => ({
          questionType:
            q.questionType === 'true_false' || q.questionType === 'short_answer'
              ? q.questionType
              : 'multiple_choice',
          question: q.question,
          options: [...(q.options ?? [])],
          correctAnswer: q.correctAnswer,
        }));
        const learningCardId = (currentBackend?.id ?? currentCard?.id ?? '').trim();
        const existing = await dl.quizzes.listForParentAndLearningCard(pid, learningCardId);
        for (const row of existing) {
          if (childIds.includes(row.studentId)) {
            await dl.quizzes.delete(row.id);
          }
        }
        for (const sid of childIds) {
          await dl.quizzes.put({
            id: crypto.randomUUID(),
            learningCardId,
            parentId: pid,
            studentId: sid,
            createdAt,
            questions,
            status: 'completed',
            sourceQuizText: quizText,
            structuredPayloadJson,
          });
        }
        setQuizWorksheetBanner((b) =>
          b?.threadId === threadId ? { threadId, phase: 'done' } : b,
        );
      } catch (e) {
        window.alert(e instanceof Error ? e.message : t('knowledge.quizWorksheetGenerateError'));
        setQuizWorksheetBanner((b) =>
          b?.threadId === threadId ? { threadId, phase: 'offer' } : b,
        );
      }
    })();
  }, [threadId, msgs, parentUserId, parentChildrenIds, currentBackend?.id, currentCard?.id, t]);

  if (!canUseKnowledge) {
    return (
      <section
        className={cx('panel', 'panel--knowledge', active && 'is-visible')}
        id="panel-knowledge"
        data-panel="knowledge"
        role="region"
        aria-labelledby="panel-knowledge-title"
        hidden={!active}
      />
    );
  }

  const emptyHint = role === 'student' ? t('knowledge.emptyStudent') : t('knowledge.emptyParent');
  const showParentEmptyExample = role === 'parent' && items.length === 0;
  const showQuizWorksheetBanner =
    role === 'parent' &&
    !!threadId &&
    quizWorksheetBanner != null &&
    quizWorksheetBanner.threadId === threadId &&
    (quizWorksheetBanner.phase !== 'offer' ||
      (streamingThreadId === null && !tonightActionBusy));

  const quizWorksheetBannerText =
    quizWorksheetBanner?.phase === 'offer'
      ? t('knowledge.quizWorksheetOfferPrompt')
      : quizWorksheetBanner?.phase === 'generating'
        ? t('knowledge.quizWorksheetGenerating')
        : t('knowledge.quizWorksheetDone');

  const renderKnowledgeInboxItem = (item: KnowledgeInboxRow) => (
    <button
      key={item.id}
      type="button"
      className={cx('inbox-item', 'inbox-item--knowledge', item.id === threadId && 'is-active')}
      data-id={item.id}
      onClick={() => setSelectedKnowledgeThreadId(item.id)}
    >
      <div className="inbox-item__title">{item.title}</div>
      <KnowledgeCardLabels
        card={{ subject: item.subject }}
        studentLearningStatus={item.studentLearningStatus}
        studentFinishedType={item.studentFinishedType}
      />
      <div className="inbox-item__meta">{item.date}</div>
    </button>
  );

  return (
    <section
      className={cx('panel', 'panel--knowledge', active && 'is-visible')}
      id="panel-knowledge"
      data-panel="knowledge"
      role="region"
      aria-labelledby="panel-knowledge-title"
      hidden={!active}
    >
      <PanelHeader
        titleId="panel-knowledge-title"
        title={t('panels.knowledge')}
        hint={hints.knowledge ?? ''}
        hintId="knowledge-role-hint"
        split
      />

      <div className="chat-layout chat-layout--rounded">
        {showParentEmptyExample ? (
          <KnowledgeParentEmptyExample />
        ) : (
          <>
            <div className="inbox" id="knowledge-inbox-list" aria-label={t('knowledge.inboxListAria')}>
              {!items.length ? (
                <p className="panel__hint" style={{ padding: '1rem' }}>
                  {emptyHint}
                </p>
              ) : (
                items.map((item) => renderKnowledgeInboxItem(item))
              )}
            </div>
            <div className="thread-pane">
              <div className="thread-header thread-header--knowledge">
                <div className="thread-header__main">
                  <h3 className="thread-title" id="knowledge-thread-title">
                    {current?.title ?? t('knowledge.selectCard')}
                  </h3>
                  {currentCard ? (
                    <div className="thread-header__knowledge-toolbar">
                      <div className="thread-header__knowledge-left">
                        <KnowledgeCardLabels
                          layout="thread"
                          card={currentCard}
                          studentLearningStatus={
                            role === 'student' && studentFeedback ? studentFeedback.status : undefined
                          }
                          studentFinishedType={
                            role === 'student' && studentFeedback?.status === 'finished'
                              ? studentFeedback.finishedType
                              : undefined
                          }
                        />
                      </div>
                      {role === 'student' && studentFeedback ? (
                        <div className="thread-header__knowledge-right">
                          <StudentLearningFinishRow
                            threadId={threadId}
                            studentFeedback={studentFeedback}
                            choicesLocked={challengeFeedbackOpen}
                            onFinishEasy={finishCardEasy}
                            onFinishThink={finishCardThink}
                            onOpenSkipFeedback={() => setChallengeFeedbackOpen(true)}
                            onChangeMind={reopenCardLearning}
                            t={t}
                          />
                        </div>
                      ) : null}
                      {role === 'parent' && currentBackend && threadId ? (
                        <div className="thread-header__knowledge-right">
                          <Button
                            type="button"
                            variant="primary"
                            pill
                            sm
                            id="knowledge-parent-need-help"
                            className="knowledge-parent-need-help-btn"
                            aria-label={t('knowledge.parentDoNotUnderstandAria')}
                            aria-pressed={parentFeedback?.doNotUnderstand === true}
                            disabled={!threadId}
                            onClick={() => void persistParentDoNotUnderstand()}
                          >
                            {t('knowledge.parentDoNotUnderstandButton')}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {role === 'parent' && currentBackend && currentCard ? (
                <LearningCardParentKnowledgeView
                  summaryText={resolveParentSummaryFromParts(
                    {
                      parentSummary: currentBackend.parentSummary,
                      translatedSummaries: currentBackend.translatedSummaries,
                    },
                    uiLangFromI18n(i18n.resolvedLanguage ?? i18n.language),
                  )}
                  tonightActionsIncluded={includedSteps}
                  tonightActionsDone={parentFeedback?.tonightActionsDone}
                  onToggleTonightDone={(preset) => void persistParentTonightDone(preset)}
                  tonightKicker={t('learningCard.wizard.tonightActions')}
                  bridgedAiLabel={t('common.bridgedAi')}
                  expandLabel={t('knowledge.parentPreviewExpand')}
                  collapseLabel={t('knowledge.parentPreviewCollapse')}
                />
              ) : null}

              <div className="msg-thread" id="knowledge-msg-thread">
                {role === 'student' && currentCard?.childKnowledge ? (
                  <KnowledgeChildDiscovery
                    data={currentCard.childKnowledge}
                    onVideoLinkClick={() => {
                      if (!studentUserId || !threadId) return;
                      const b = cardBackendsRef.current.find((c) => c.threadId === threadId);
                      const fb = b ? getStudentFeedbackForUser(b, studentUserId) : null;
                      void persistStudentPatch({
                        watchedVideo: true,
                        ...(fb?.status === 'not_started' ? { status: 'learning' as const } : {}),
                      });
                    }}
                  />
                ) : null}
                {role === 'student' && currentCard && !currentCard.childKnowledge && msgs.length === 0 ? (
                  <p className="panel__hint knowledge-student-fallback">{t('knowledge.studentNoChildContent')}</p>
                ) : null}
                {!msgs.length && role === 'parent' && !currentCard ? (
                  <p className="panel__hint">{t('knowledge.demoThread')}</p>
                ) : null}
                {msgs.length > 0
                  ? msgs.map((m, idx) => (
                      <div key={`${idx}-${m.who}`} className={cx('msg', m.type === 'out' ? 'msg--out' : 'msg--in')}>                        
                        <div className="msg__who">{msgWhoLabel(m.who, t)}</div>
                        {m.type === 'in' ? (
                          <>
                            <MessageAttachmentGrid attachments={m.attachments} />
                            {m.text?.trim() ? (
                              <Markdown className="markdown-content--msg-in">{m.text}</Markdown>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <MessageAttachmentGrid attachments={m.attachments} />
                            {m.text?.trim() ? (
                              <div className="msg__body msg__body--plain" style={{ whiteSpace: 'pre-wrap' }}>
                                {m.text}
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    ))
                  : null}
                {streamingThreadId === threadId && streamingReply.trim().length > 0 ? (
                  <div className={cx('msg', 'msg--in')}>
                    <div className="msg__who">{t('common.bridgedAi')}</div>
                    <Markdown className="markdown-content--msg-in">{streamingReply}</Markdown>
                  </div>
                ) : null}
                {showAiAnalyzing ? (
                  <div className={cx('msg', 'msg--in', 'knowledge-ai-thinking')}>
                    <div className="msg__who">{t('common.bridgedAi')}</div>
                    <div className="knowledge-ai-thinking__row" aria-live="polite">
                      <span className="knowledge-ai-thinking__label">Analyzing</span>
                      <span className="knowledge-ai-thinking__dots" aria-hidden>
                        <span />
                        <span />
                        <span />
                      </span>
                    </div>
                  </div>
                ) : null}
                {showQuizWorksheetBanner ? (
                  <div
                    className="knowledge-quiz-worksheet-offer"
                    role="region"
                    aria-label={t('knowledge.quizWorksheetOfferRegionAria')}
                    aria-busy={quizWorksheetBanner?.phase === 'generating'}
                  >
                    <div className="knowledge-quiz-worksheet-offer__lead">
                      <span className="learning-card-wizard-promo__icon" aria-hidden>
                        <Sparkles strokeWidth={2} size={22} />
                      </span>
                      <p className="knowledge-quiz-worksheet-offer__text">{quizWorksheetBannerText}</p>
                    </div>
                    {quizWorksheetBanner?.phase === 'offer' ? (
                      <div className="knowledge-quiz-worksheet-offer__actions">
                        <Button
                          type="button"
                          variant="secondary"
                          pill
                          className="btn--sm knowledge-quiz-worksheet-offer__icon-btn"
                          aria-label={t('knowledge.quizWorksheetOfferYesAria')}
                          onClick={confirmQuizWorksheetOffer}
                        >
                          <Check strokeWidth={2.25} size={18} aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          pill
                          className="btn--sm knowledge-quiz-worksheet-offer__icon-btn"
                          aria-label={t('knowledge.quizWorksheetOfferNoAria')}
                          onClick={dismissQuizWorksheetOffer}
                        >
                          <X strokeWidth={2.25} size={18} aria-hidden />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div ref={knowledgeThreadEndRef} aria-hidden />
              </div>
              <input
                ref={knowledgeFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                id="knowledge-file-input"
                aria-hidden
                tabIndex={-1}
                onChange={(e) => {
                  void addFromFileList(e.target.files);
                  e.target.value = '';
                }}
              />
              <Composer
                inputId="knowledge-input"
                className="chat-composer"
                label={t('common.message')}
                value={input}
                onChange={setInput}
                onSubmit={send}
                enterToSubmit
                placeholder={t('knowledge.composerPlaceholder')}
                previewSlot={
                  pending.length > 0 ? (
                    <div className="composer__preview-strip">
                      {pending.map((p) => (
                        <div key={p.id} className="composer__preview-chip">
                          <img src={p.dataUrl} alt="" />
                          <button
                            type="button"
                            className="composer__preview-remove"
                            aria-label={t('common.removeAttachment')}
                            onClick={() => remove(p.id)}
                          >
                            脳
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null
                }
                actions={
                  <>
                    <div className="composer__actions-leading">
                      <Button
                        type="button"
                        variant="text"
                        className="btn--sm composer__attach-btn"
                        id="knowledge-attach-image"
                        aria-label={t('common.attachImage')}
                        onClick={() => knowledgeFileInputRef.current?.click()}
                      >
                        <ImagePlus strokeWidth={2} size={20} aria-hidden />
                      </Button>
                      {role === 'student' && studentUserId && currentBackend?.id ? (
                        <KnowledgeStudentQuizBlock
                          studentUserId={studentUserId}
                          learningCardId={currentBackend.id}
                          learningCardsEpoch={learningCardsEpoch}
                          onSubmittedForEval={runEvalQuizAfterWorksheet}
                          actionDisabled={!threadId || tonightActionBusy || streamingThreadId === threadId}
                        />
                      ) : null}
                      {composerTonightSteps.length > 0 ? (
                        <div
                          className="knowledge-tonight-actions knowledge-tonight-actions--composer"
                          role="group"
                          aria-label={t('knowledge.ariaSuggestedTasks')}
                        >
                          {composerTonightSteps.map((action) => (
                            <Button
                              key={action.preset}
                              type="button"
                              variant="secondary"
                              pill
                              className="btn--sm knowledge-tonight-actions__btn"
                              id={`btn-knowledge-tonight-${action.preset}`}
                              title={t(`learningCard.wizard.tonightPreset.${action.preset}.title`)}
                              disabled={tonightActionBusy || !threadId || streamingThreadId === threadId}
                              onClick={() => runTonightActionFlow(action.preset)}
                            >
                              {knowledgeTonightActionLabel(action.preset, t)}
                            </Button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <Button
                      variant="primary"
                      pill
                      className="btn--sm"
                      id="knowledge-send"
                      disabled={tonightActionBusy || (threadId != null && streamingThreadId === threadId)}
                      onClick={send}
                    >
                      {t('common.send')}
                    </Button>
                  </>
                }
              />
            </div>
            {role === 'student' && studentFeedback && challengeFeedbackOpen ? (
              <StudentChallengeFeedbackModal
                key={threadId}
                onClose={() => setChallengeFeedbackOpen(false)}
                onSubmit={(feeling) => {
                  void persistStudentPatch({
                    status: 'finished',
                    finishedType: 'challenge',
                    feeling: feeling.trim() || undefined,
                  });
                  setChallengeFeedbackOpen(false);
                }}
              />
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
