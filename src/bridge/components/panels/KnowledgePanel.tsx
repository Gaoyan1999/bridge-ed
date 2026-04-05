import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  LearningCardBackend,
  LearningCardStudentFeedback,
  LearningCardStudentFinishedType,
  LearningCardStudentLearningStatus,
} from '@/data/entity/learning-card-backend';

type StudentLearningStatusKey = LearningCardStudentLearningStatus;

type KnowledgeInboxRow = {
  id: string;
  title: string;
  subject: string;
  date: string;
  studentLearningStatus?: StudentLearningStatusKey;
  studentFinishedType?: LearningCardStudentFinishedType;
};

import { useTranslation } from 'react-i18next';
import { ImagePlus, ListChecks } from 'lucide-react';
import { useBridge } from '@/bridge/BridgeContext';
import { panelHintsForRole } from '@/bridge/panelHints';
import { DEMO_PARENT_USER_ID } from '@/bridge/mockData';
import type { TFunction } from 'i18next';
import {
  LEARNING_CARD_TONIGHT_PRESET_LABELS,
  type LearningCardItem,
  type LearningCardTonightActionPreset,
} from '@/bridge/types';
import { KnowledgeChildDiscovery } from '@/bridge/components/KnowledgeChildDiscovery';
import { Markdown } from '@/bridge/components/Markdown';
import { MessageAttachmentGrid } from '@/bridge/components/MessageAttachmentGrid';
import { KnowledgeParentEmptyExample } from '@/bridge/components/KnowledgeParentEmptyExample';
import { Button } from '@/bridge/components/ui/Button';
import { Composer } from '@/bridge/components/ui/Composer';
import { PanelHeader } from '@/bridge/components/ui/PanelHeader';
import { StudentChallengeFeedbackModal } from '@/bridge/components/ui/StudentChallengeFeedbackModal';
import { cx } from '@/bridge/cx';
import { getDataLayer } from '@/data';
import { getLlmApi } from '@/data/api/llm-api';
import {
  getStudentFeedbackForUser,
  learningCardBackendToItem,
  upsertStudentFeedbackOnCard,
} from '@/data/learning-card-mappers';
import { MAX_MESSAGE_IMAGES, usePendingImageAttachments } from '@/bridge/usePendingImageAttachments';

/**
 * Subject line from `learningCardBackendToItem` is often `G9 · Math` — show subject-focused text (drop grade when present).
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
      .split(' · ')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length <= 1) {
      out.push({ key: 'subject', kind: 'subject', text: parts[0] ?? line });
    } else {
      const [first, ...rest] = parts;
      const gradeLike = Boolean(first && /^G\d+/i.test(first));
      const subjectText = gradeLike && rest.length ? rest.join(' · ') : line;
      out.push({ key: 'subject', kind: 'subject', text: subjectText });
    }
  }
  return out;
}

function knowledgeTonightSlashCommand(preset: LearningCardTonightActionPreset): string {
  if (preset === 'quiz') return '/quiz';
  if (preset === 'parent_led_practice') return '/practice';
  return '/teach-back';
}

function knowledgeTonightActionLabel(preset: LearningCardTonightActionPreset, t: TFunction): string {
  if (preset === 'parent_led_practice') return t('knowledge.practice.button');
  return t(`knowledge.taskShort.${preset}`);
}

/** Inbox rows keep subject + status on opposite ends; thread header groups both on the left. */
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
  const splitForInbox = layout === 'inbox' && showProgress;
  const statusLine =
    studentLearningStatus === 'finished' && studentFinishedType
      ? t(`knowledge.studentFinishedType.${studentFinishedType}`)
      : studentLearningStatus != null
        ? t(`knowledge.studentLearningStatus.${studentLearningStatus}`)
        : '';
  const statusTitle =
    studentLearningStatus === 'finished' && studentFinishedType
      ? `${t('knowledge.lcStatus')}: ${t(`knowledge.studentFinishedType.${studentFinishedType}`)}`
      : studentLearningStatus != null
        ? `${t('knowledge.lcStatus')}: ${t(`knowledge.studentLearningStatus.${studentLearningStatus}`)}`
        : '';
  if (!tags.length && !showProgress) return null;
  return (
    <div
      className={cx(
        'knowledge-inbox__labels',
        splitForInbox && 'knowledge-inbox__labels--split',
      )}
      role="group"
      aria-label={showProgress ? t('knowledge.ariaInboxLabels') : t('common.subject')}
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
      {studentLearningStatus != null ? (
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
  const finished = studentFeedback.status === 'finished';
  const ft = studentFeedback.finishedType;
  const busy = !threadId;
  const lock = busy || finished || Boolean(choicesLocked);

  return (
    <div className="knowledge-lc-finish-wrap" role="group" aria-label={t('knowledge.ariaFinishChoices')}>
      <div className="knowledge-lc-finish-row">
        <button
          type="button"
          className={cx(
            'knowledge-lc-finish-btn',
            'knowledge-lc-finish-btn--green',
            finished && ft === 'pretty_easy' && 'knowledge-lc-finish-btn--picked',
          )}
          disabled={lock}
          aria-pressed={finished && ft === 'pretty_easy'}
          onClick={onFinishEasy}
        >
          {t('knowledge.studentFinishedType.pretty_easy')}
        </button>
        <button
          type="button"
          className={cx(
            'knowledge-lc-finish-btn',
            'knowledge-lc-finish-btn--blue',
            finished && ft === 'think_get_it' && 'knowledge-lc-finish-btn--picked',
          )}
          disabled={lock}
          aria-pressed={finished && ft === 'think_get_it'}
          onClick={onFinishThink}
        >
          {t('knowledge.studentFinishedType.think_get_it')}
        </button>
        <button
          type="button"
          className={cx(
            'knowledge-lc-finish-btn',
            'knowledge-lc-finish-btn--red',
            finished && ft === 'challenge' && 'knowledge-lc-finish-btn--picked',
          )}
          disabled={lock}
          aria-pressed={finished && ft === 'challenge'}
          onClick={onOpenSkipFeedback}
        >
          {t('knowledge.studentFinishedType.challenge')}
        </button>
      </div>
      {finished ? (
        <button type="button" className="knowledge-lc-finish-change" onClick={onChangeMind}>
          {t('knowledge.finishChange')}
        </button>
      ) : null}
    </div>
  );
}

function msgWhoLabel(who: string, tf: (k: string) => string): string {
  if (who === 'You') return tf('common.you');
  if (who === 'BridgeEd AI') return tf('common.bridgedAi');
  return who;
}

export function KnowledgePanel({ active }: { active: boolean }) {
  const { t } = useTranslation();
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
  const [challengeFeedbackOpen, setChallengeFeedbackOpen] = useState(false);
  const [cardBackends, setCardBackends] = useState<LearningCardBackend[]>([]);
  const cardBackendsRef = useRef(cardBackends);
  cardBackendsRef.current = cardBackends;

  const cards = useMemo(() => cardBackends.map(learningCardBackendToItem), [cardBackends]);
  const knowledgeFileInputRef = useRef<HTMLInputElement>(null);
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
      return row;
    });
  }, [cards, cardBackends, role, studentUserId]);

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

  const finishCardEasy = useCallback(() => {
    void persistStudentPatch({ status: 'finished', finishedType: 'pretty_easy', feeling: undefined });
  }, [persistStudentPatch]);

  const finishCardThink = useCallback(() => {
    void persistStudentPatch({ status: 'finished', finishedType: 'think_get_it', feeling: undefined });
  }, [persistStudentPatch]);

  const reopenCardLearning = useCallback(() => {
    void persistStudentPatch({ status: 'learning', finishedType: undefined, feeling: undefined });
  }, [persistStudentPatch]);

  const includedSteps = useMemo(
    () => currentCard?.tonightActions.filter((a) => a.include) ?? [],
    [currentCard],
  );
  const msgs = threadId ? knowledgeThreads[threadId] ?? [] : [];

  useEffect(() => {
    setChallengeFeedbackOpen(false);
  }, [threadId]);

  useEffect(() => {
    if (!active || !threadId) return;
    const card = cards.find((c) => c.threadId === threadId);
    if (!card) return;
    seedKnowledgeThreadIfEmpty(card);
  }, [active, threadId, cards, seedKnowledgeThreadIfEmpty]);

  const send = () => {
    const v = input.trim();
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
        });
      }
      const api = getLlmApi();
      const title = currentCard?.title;
      try {
        const result =
          preset === 'quiz'
            ? await api.knowledgeQuiz({ cardTitle: title })
            : preset === 'parent_led_practice'
              ? await api.knowledgePractice({ cardTitle: title })
              : await api.knowledgeTeachBack({ cardTitle: title });
        appendKnowledgeMessage(threadId, {
          who: 'BridgeEd AI',
          type: 'in',
          text: result.reply,
        });
      } catch (e) {
        appendKnowledgeMessage(threadId, {
          who: 'BridgeEd AI',
          type: 'in',
          text: e instanceof Error ? e.message : 'Knowledge tonight command failed.',
        });
      } finally {
        setTonightActionBusy(false);
      }
    },
    [
      threadId,
      tonightActionBusy,
      appendKnowledgeMessage,
      currentCard?.title,
      role,
      persistStudentPatch,
      studentUserId,
    ],
  );

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
                    </div>
                  ) : null}
                </div>
              </div>

              {currentCard ? (
                <div className="knowledge-lc-detail">
                  <section className="knowledge-lc-detail__block" aria-labelledby="knowledge-steps-heading">
                    <h4 id="knowledge-steps-heading" className="knowledge-lc-detail__title">
                      <ListChecks className="knowledge-lc-detail__title-icon" strokeWidth={2} size={16} aria-hidden />
                      {t('knowledge.lcStepsTitle')}
                    </h4>
                    {includedSteps.length === 0 ? (
                      <p className="knowledge-lc-detail__empty">{t('knowledge.lcStepsEmpty')}</p>
                    ) : (
                      <ul className="knowledge-lc-detail__steps">
                        {includedSteps.map((action) => {
                          const copy = LEARNING_CARD_TONIGHT_PRESET_LABELS[action.preset];
                          return (
                            <li key={action.preset} className="knowledge-lc-detail__step">
                              <span className="knowledge-lc-detail__step-title">{copy.title}</span>
                              <span className="knowledge-lc-detail__step-desc">{copy.description}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>

                  {role === 'student' && studentFeedback ? (
                    <section className="knowledge-lc-detail__block" aria-labelledby="knowledge-status-heading">
                      <h4 id="knowledge-status-heading" className="knowledge-lc-detail__status-heading">
                        {t('knowledge.lcStatus')}
                      </h4>
                      <div className="knowledge-parent-fb" role="group" aria-label={t('knowledge.studentYourProgress')}>
                        <label className="knowledge-parent-fb__check">
                          <input
                            type="checkbox"
                            checked={studentFeedback.watchedVideo}
                            onChange={() => void persistStudentPatch({ watchedVideo: !studentFeedback.watchedVideo })}
                          />
                          {t('knowledge.studentWatchedVideo')}
                        </label>
                      </div>
                    </section>
                  ) : null}
                </div>
              ) : null}

              <div className="msg-thread" id="knowledge-msg-thread">
                {role === 'student' && currentCard?.childKnowledge ? (
                  <KnowledgeChildDiscovery data={currentCard.childKnowledge} />
                ) : null}
                {role === 'student' && currentCard && !currentCard.childKnowledge && msgs.length === 0 ? (
                  <p className="panel__hint knowledge-student-fallback">{t('knowledge.studentNoChildContent')}</p>
                ) : null}
                {!msgs.length && role === 'parent' ? <p className="panel__hint">{t('knowledge.demoThread')}</p> : null}
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
                            ×
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
                      {includedSteps.length > 0 ? (
                        <div
                          className="knowledge-tonight-actions knowledge-tonight-actions--composer"
                          role="group"
                          aria-label={t('knowledge.ariaSuggestedTasks')}
                        >
                          {includedSteps.map((action) => (
                            <Button
                              key={action.preset}
                              type="button"
                              variant="secondary"
                              pill
                              className="btn--sm knowledge-tonight-actions__btn"
                              id={`btn-knowledge-tonight-${action.preset}`}
                              title={LEARNING_CARD_TONIGHT_PRESET_LABELS[action.preset].title}
                              disabled={tonightActionBusy || !threadId}
                              onClick={() => runTonightActionFlow(action.preset)}
                            >
                              {knowledgeTonightActionLabel(action.preset, t)}
                            </Button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <Button variant="primary" pill className="btn--sm" id="knowledge-send" onClick={send}>
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
