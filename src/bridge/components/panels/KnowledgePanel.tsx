import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ImagePlus, ListChecks } from 'lucide-react';
import { useBridge } from '@/bridge/BridgeContext';
import { panelHintsForRole } from '@/bridge/panelHints';
import { MOCK_PRACTICE_AI_REPLY } from '@/bridge/knowledge-practice-mock';
import { DEMO_PARENT_USER_ID } from '@/bridge/mockData';
import {
  LEARNING_CARD_TONIGHT_PRESET_LABELS,
  type LearningCardItem,
  type LearningCardTonightActionPreset,
} from '@/bridge/types';
import { Markdown } from '@/bridge/components/Markdown';
import { MessageAttachmentGrid } from '@/bridge/components/MessageAttachmentGrid';
import { KnowledgeParentEmptyExample } from '@/bridge/components/KnowledgeParentEmptyExample';
import { Button } from '@/bridge/components/ui/Button';
import { Composer } from '@/bridge/components/ui/Composer';
import { PanelHeader } from '@/bridge/components/ui/PanelHeader';
import { cx } from '@/bridge/cx';
import { getDataLayer } from '@/data';
import { learningCardBackendToItem } from '@/data/learning-card-mappers';
import { MAX_MESSAGE_IMAGES, usePendingImageAttachments } from '@/bridge/usePendingImageAttachments';

const LC_COMPLETION_LS = 'bridge-ed:knowledge-lc-done:';

function readLcCompletion(threadId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(`${LC_COMPLETION_LS}${threadId}`) === '1';
  } catch {
    return false;
  }
}

function writeLcCompletion(threadId: string, done: boolean) {
  try {
    localStorage.setItem(`${LC_COMPLETION_LS}${threadId}`, done ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/**
 * Subject line from `learningCardBackendToItem` is often `G9 · Math` — show subject-focused text (drop grade when present).
 */
function knowledgeLabelsFromCard(card: Pick<LearningCardItem, 'subject' | 'status'>): {
  key: string;
  kind: 'subject' | 'status';
  text: string;
}[] {
  const out: { key: string; kind: 'subject' | 'status'; text: string }[] = [];
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
  const st = card.status.trim();
  if (st && st !== '—') {
    out.push({ key: 'status', kind: 'status', text: st });
  }
  return out;
}

function KnowledgeTonightTasks({
  card,
  omitPresets = [],
}: {
  card: Pick<LearningCardItem, 'tonightActions'>;
  omitPresets?: LearningCardTonightActionPreset[];
}) {
  const { t } = useTranslation();
  const omit = new Set(omitPresets);
  const tasks = card.tonightActions.filter((a) => a.include && !omit.has(a.preset));
  if (!tasks.length) return null;
  return (
    <div className="knowledge-inbox__tasks" role="group" aria-label={t('knowledge.ariaSuggestedTasks')}>
      {tasks.map((a) => (
        <span key={a.preset} className="knowledge-inbox__task-chip">
          {t(`knowledge.taskShort.${a.preset}`)}
        </span>
      ))}
    </div>
  );
}

function KnowledgeCardLabels({ card }: { card: Pick<LearningCardItem, 'subject' | 'status'> }) {
  const { t } = useTranslation();
  const tags = knowledgeLabelsFromCard(card).map((row) => ({
    ...row,
    aria: row.kind === 'subject' ? t('common.subject') : t('common.status'),
  }));
  if (!tags.length) return null;
  return (
    <div className="knowledge-inbox__labels" role="group" aria-label={t('knowledge.ariaSubjectStatus')}>
      {tags.map((row) => (
        <span
          key={row.key}
          className={cx(
            'knowledge-inbox__label',
            row.kind === 'subject' && 'knowledge-inbox__label--subject',
            row.kind === 'status' && 'knowledge-inbox__label--status',
          )}
          title={`${row.aria}: ${row.text}`}
        >
          <span className="visually-hidden">
            {row.aria}:{' '}
          </span>
          {row.text}
        </span>
      ))}
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
  } = useBridge();
  const hints = panelHintsForRole(t, role);
  const [input, setInput] = useState('');
  const [practiceBusy, setPracticeBusy] = useState(false);
  const [cards, setCards] = useState<LearningCardItem[]>([]);
  const [completionDone, setCompletionDone] = useState(false);
  const practiceReplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useEffect(() => {
    if (!canUseKnowledge) {
      setCards([]);
      return;
    }
    const studentId = role === 'student' ? (currentUser?.id ?? '').trim() : '';
    if (role === 'student' && !studentId) {
      setCards([]);
      return;
    }
    let cancelled = false;
    const load =
      role === 'parent'
        ? getDataLayer().learningCards.listForParentUser(parentUserId)
        : getDataLayer().learningCards.listForStudentUser(studentId);

    void load
      .then((rows) => {
        if (!cancelled) setCards(rows.map(learningCardBackendToItem));
      })
      .catch(() => {
        if (!cancelled) setCards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [learningCardsEpoch, canUseKnowledge, role, parentUserId, currentUser?.id]);

  const items = useMemo(
    () =>
      cards.map((c) => ({
        id: c.threadId,
        title: c.title,
        subject: c.subject,
        status: c.status,
        date: new Date(c.at).toISOString().slice(0, 10),
      })),
    [cards],
  );

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
  const includedSteps = useMemo(
    () => currentCard?.tonightActions.filter((a) => a.include) ?? [],
    [currentCard],
  );
  const msgs = threadId ? knowledgeThreads[threadId] ?? [] : [];

  useEffect(() => {
    if (!threadId) {
      setCompletionDone(false);
      return;
    }
    setCompletionDone(readLcCompletion(threadId));
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
  };

  useEffect(() => {
    return () => {
      if (practiceReplyTimerRef.current) clearTimeout(practiceReplyTimerRef.current);
    };
  }, []);

  const showPracticeAction = Boolean(
    currentCard?.tonightActions.some((a) => a.preset === 'parent_led_practice' && a.include),
  );

  const runPracticeFlow = useCallback(() => {
    if (!threadId || practiceBusy) return;
    setPracticeBusy(true);
    appendKnowledgeMessage(threadId, { who: 'You', type: 'out', text: '/practice' });
    if (practiceReplyTimerRef.current) clearTimeout(practiceReplyTimerRef.current);
    practiceReplyTimerRef.current = setTimeout(() => {
      practiceReplyTimerRef.current = null;
      appendKnowledgeMessage(threadId, {
        who: 'BridgeEd AI',
        type: 'in',
        text: MOCK_PRACTICE_AI_REPLY,
      });
      setPracticeBusy(false);
    }, 450);
  }, [threadId, practiceBusy, appendKnowledgeMessage]);

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
            <div className="inbox" id="knowledge-inbox-list">
              {!items.length ? (
                <p className="panel__hint" style={{ padding: '1rem' }}>
                  {emptyHint}
                </p>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cx('inbox-item', 'inbox-item--knowledge', item.id === threadId && 'is-active')}
                    data-id={item.id}
                    onClick={() => setSelectedKnowledgeThreadId(item.id)}
                  >
                    <div className="inbox-item__title">{item.title}</div>
                    <KnowledgeCardLabels card={{ subject: item.subject, status: item.status }} />
                    <div className="inbox-item__meta">{item.date}</div>
                  </button>
                ))
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
                        <KnowledgeCardLabels card={currentCard} />
                        <KnowledgeTonightTasks
                          card={currentCard}
                          omitPresets={showPracticeAction ? ['parent_led_practice'] : []}
                        />
                      </div>
                      {showPracticeAction ? (
                        <Button
                          type="button"
                          variant="secondary"
                          pill
                          className="btn--sm thread-header__practice-btn"
                          id="btn-knowledge-practice"
                          disabled={practiceBusy || !threadId}
                          onClick={runPracticeFlow}
                        >
                          {t('knowledge.practice.button')}
                        </Button>
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

                  <section className="knowledge-lc-detail__block" aria-labelledby="knowledge-status-heading">
                    <h4 id="knowledge-status-heading" className="knowledge-lc-detail__status-heading">
                      {t('knowledge.lcStatus')}
                    </h4>
                    <button
                      type="button"
                      className="knowledge-lc-completion"
                      disabled={!threadId}
                      aria-pressed={completionDone}
                      onClick={() => {
                        if (!threadId) return;
                        const next = !completionDone;
                        setCompletionDone(next);
                        writeLcCompletion(threadId, next);
                      }}
                    >
                      <span
                        className="knowledge-lc-completion__circle"
                        data-done={completionDone ? 'true' : undefined}
                        aria-hidden
                      >
                        {completionDone ? (
                          <Check className="knowledge-lc-completion__check" strokeWidth={3} size={14} />
                        ) : null}
                      </span>
                      <span className="knowledge-lc-completion__label">{t('knowledge.lcDone')}</span>
                    </button>
                  </section>
                </div>
              ) : null}

              <div className="msg-thread" id="knowledge-msg-thread">
                {!msgs.length ? (
                  <p className="panel__hint">{t('knowledge.demoThread')}</p>
                ) : (
                  msgs.map((m, idx) => (
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
                )}
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
                    <Button variant="primary" pill className="btn--sm" id="knowledge-send" onClick={send}>
                      {t('common.send')}
                    </Button>
                  </>
                }
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
