import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBridge } from '@/bridge/BridgeContext';
import { DEMO_PARENT_USER_ID } from '@/bridge/mockData';
import { MOCK_PRACTICE_AI_REPLY } from '@/bridge/knowledge-practice-mock';
import {
  LEARNING_CARD_TONIGHT_PRESET_SHORT,
  type LearningCardItem,
  type LearningCardTonightActionPreset,
} from '@/bridge/types';
import { Markdown } from '@/bridge/components/Markdown';
import { Button } from '@/bridge/components/ui/Button';
import { Composer } from '@/bridge/components/ui/Composer';
import { PanelHeader } from '@/bridge/components/ui/PanelHeader';
import { cx } from '@/bridge/cx';
import { getDataLayer } from '@/data';
import { learningCardBackendToItem } from '@/data/learning-card-mappers';

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

function KnowledgeTonightTasks({
  card,
  omitPresets = [],
}: {
  card: Pick<LearningCardItem, 'tonightActions'>;
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
    if (!v || !threadId) return;
    appendKnowledgeMessage(threadId, { who: 'You', type: 'out', text: v });
    setInput('');
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
                      Practice
                    </Button>
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
                    <Markdown className="markdown-content--msg-in">{m.text || ''}</Markdown>
                  ) : (
                    <div className="msg__body msg__body--plain" style={{ whiteSpace: 'pre-wrap' }}>
                      {m.text}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <Composer
            inputId="knowledge-input"
            className="chat-composer"
            label="Message"
            value={input}
            onChange={setInput}
            placeholder="Ask about this card’s topic, or paste a homework question…"
            actions={
              <Button variant="primary" pill className="btn--sm" id="knowledge-send" onClick={send}>
                Send
              </Button>
            }
          />
        </div>
      </div>
    </section>
  );
}
