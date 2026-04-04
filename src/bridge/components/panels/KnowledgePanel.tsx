import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
<<<<<<< Updated upstream
import { useBridge } from '@/bridge/BridgeContext';
import { DEMO_PARENT_USER_ID } from '@/bridge/mockData';
import { MOCK_PRACTICE_AI_REPLY } from '@/bridge/knowledge-practice-mock';
import {
  LEARNING_CARD_TONIGHT_PRESET_SHORT,
=======
import { useTranslation } from 'react-i18next';
import { ImagePlus } from 'lucide-react';
import { useBridge } from '@/bridge/BridgeContext';
import { DEMO_PARENT_USER_ID } from '@/bridge/mockData';
import {
  LEARNING_CARD_TONIGHT_ACTION_PRESETS,
>>>>>>> Stashed changes
  type LearningCardItem,
  type LearningCardTonightActionPreset,
} from '@/bridge/types';
import { Markdown } from '@/bridge/components/Markdown';
import { MessageAttachmentGrid } from '@/bridge/components/MessageAttachmentGrid';
import { Button } from '@/bridge/components/ui/Button';
import { Composer } from '@/bridge/components/ui/Composer';
import { PanelHeader } from '@/bridge/components/ui/PanelHeader';
import { cx } from '@/bridge/cx';
import { getDataLayer } from '@/data';
import { learningCardBackendToItem } from '@/data/learning-card-mappers';
import { MAX_MESSAGE_IMAGES, usePendingImageAttachments } from '@/bridge/usePendingImageAttachments';

/**
 * Subject line from `learningCardBackendToItem` is often `G9 · Math` — we show **subject only** (drop grade).
 */
function knowledgeLabelsFromCard(card: Pick<LearningCardItem, 'subject' | 'status'>): {
  key: string;
  kind: 'subject' | 'status';
  aria: string;
  text: string;
}[] {
  const out: { key: string; kind: 'subject' | 'status'; aria: string; text: string }[] = [];
  const line = card.subject.trim();
  if (line) {
    const parts = line.split(' · ').map((s) => s.trim()).filter(Boolean);
    if (parts.length <= 1) {
      out.push({ key: 'subject', kind: 'subject', aria: 'Subject', text: parts[0] ?? line });
    } else {
      const [first, ...rest] = parts;
      const gradeLike = Boolean(first && /^G\d+/i.test(first));
      const subjectText = gradeLike && rest.length ? rest.join(' · ') : line;
      out.push({ key: 'subject', kind: 'subject', aria: 'Subject', text: subjectText });
    }
  }
  const st = card.status.trim();
  if (st && st !== '—') {
    out.push({ key: 'status', kind: 'status', aria: 'Status', text: st });
  }
  return out;
}

/** One row of tonight actions: each enabled preset is a pill button (same component, stable order). */
function KnowledgeTonightTaskButtons({
  card,
  onPresetClick,
  practiceBusy,
  threadId,
}: {
  card: Pick<LearningCardItem, 'tonightActions'>;
<<<<<<< Updated upstream
  /** Presets shown elsewhere (e.g. Practice as a primary button). */
  omitPresets?: LearningCardTonightActionPreset[];
}) {
  const omit = new Set(omitPresets);
  const tasks = card.tonightActions.filter((a) => a.include && !omit.has(a.preset));
  if (!tasks.length) return null;
  return (
    <div className="knowledge-inbox__tasks" role="group" aria-label="Tonight’s suggested tasks">
      {tasks.map((a) => (
        <span key={a.preset} className="knowledge-inbox__task-chip">
          {LEARNING_CARD_TONIGHT_PRESET_SHORT[a.preset]}
        </span>
      ))}
=======
  onPresetClick: (preset: LearningCardTonightActionPreset) => void;
  practiceBusy: boolean;
  threadId: string | null | undefined;
}) {
  const { t } = useTranslation();
  const byPreset = new Map(card.tonightActions.map((a) => [a.preset, a]));
  const presets = LEARNING_CARD_TONIGHT_ACTION_PRESETS.filter((p) => byPreset.get(p)?.include);
  if (!presets.length) return null;
  return (
    <div className="knowledge-inbox__tasks" role="group" aria-label={t('knowledge.ariaSuggestedTasks')}>
      {presets.map((preset) => {
        const label = t(`knowledge.taskShort.${preset}`);
        const isPractice = preset === 'parent_led_practice';
        return (
          <Button
            key={preset}
            variant="secondary"
            pill
            sm
            id={isPractice ? 'btn-knowledge-practice' : `btn-knowledge-tonight-${preset}`}
            disabled={isPractice ? practiceBusy || !threadId : false}
            onClick={() => onPresetClick(preset)}
          >
            {label}
          </Button>
        );
      })}
>>>>>>> Stashed changes
    </div>
  );
}

function KnowledgeCardLabels({ card }: { card: Pick<LearningCardItem, 'subject' | 'status'> }) {
  const tags = knowledgeLabelsFromCard(card);
  if (!tags.length) return null;
  return (
    <div className="knowledge-inbox__labels" role="group" aria-label="Subject and status">
      {tags.map((t) => (
        <span
          key={t.key}
          className={cx(
            'knowledge-inbox__label',
            t.kind === 'subject' && 'knowledge-inbox__label--subject',
            t.kind === 'status' && 'knowledge-inbox__label--status',
          )}
          title={`${t.aria}: ${t.text}`}
        >
          <span className="visually-hidden">
            {t.aria}:{' '}
          </span>
          {t.text}
        </span>
      ))}
    </div>
  );
}

export function KnowledgePanel({ active }: { active: boolean }) {
  const {
    role,
    getHints,
    learningCardsEpoch,
    knowledgeThreads,
    selectedKnowledgeThreadId,
    setSelectedKnowledgeThreadId,
    appendKnowledgeMessage,
    seedKnowledgeThreadIfEmpty,
    currentUser,
  } = useBridge();
  const hints = getHints();
  const [input, setInput] = useState('');
  const [practiceBusy, setPracticeBusy] = useState(false);
  const [cards, setCards] = useState<LearningCardItem[]>([]);
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
  const msgs = threadId ? knowledgeThreads[threadId] ?? [] : [];

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

  const showKnowledgeToolbarRight = Boolean(currentCard?.tonightActions.some((a) => a.include));

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

  const handleTonightPresetClick = useCallback(
    (preset: LearningCardTonightActionPreset) => {
      if (preset === 'parent_led_practice') runPracticeFlow();
    },
    [runPracticeFlow],
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

  const emptyHint =
    role === 'student'
      ? 'No learning cards yet. When your teacher sends a card to your class, it will show up here.'
      : 'No learning cards yet. Open the dashboard to see cards your teacher shared.';

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
        title="Knowledge"
        hint={hints.knowledge ?? ''}
        hintId="knowledge-role-hint"
        split
      />

      <div className="chat-layout chat-layout--rounded">
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
                {current?.title ?? 'Select a card'}
              </h3>
              {currentCard ? (
                <div className="thread-header__knowledge-toolbar">
                  <div className="thread-header__knowledge-left">
                    <KnowledgeCardLabels card={currentCard} />
                  </div>
<<<<<<< Updated upstream
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
                      Practice
                    </Button>
=======
                  {showKnowledgeToolbarRight ? (
                    <div className="thread-header__knowledge-right">
                      <KnowledgeTonightTaskButtons
                        card={currentCard}
                        onPresetClick={handleTonightPresetClick}
                        practiceBusy={practiceBusy}
                        threadId={threadId}
                      />
                    </div>
>>>>>>> Stashed changes
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className="msg-thread" id="knowledge-msg-thread">
            {!msgs.length ? (
              <p className="panel__hint">Open this card from the dashboard to start the AI thread (demo).</p>
            ) : (
              msgs.map((m, idx) => (
                <div key={`${idx}-${m.who}`} className={cx('msg', m.type === 'out' ? 'msg--out' : 'msg--in')}>
                  <div className="msg__who">{m.who}</div>
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
            label="Message"
            value={input}
            onChange={setInput}
<<<<<<< Updated upstream
            placeholder="Ask about this card’s topic, or paste a homework question…"
            actions={
              <Button variant="primary" pill className="btn--sm" id="knowledge-send" onClick={send}>
                Send
              </Button>
=======
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
>>>>>>> Stashed changes
            }
          />
        </div>
      </div>
    </section>
  );
}
