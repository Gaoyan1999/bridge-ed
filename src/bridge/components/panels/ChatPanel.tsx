import { useEffect, useState } from 'react';
import { useBridge } from '@/bridge/BridgeContext';
import { Button } from '@/bridge/components/ui/Button';
import { Composer } from '@/bridge/components/ui/Composer';
import { PanelHeader } from '@/bridge/components/ui/PanelHeader';
import { cx } from '@/bridge/cx';

export function ChatPanel({ active }: { active: boolean }) {
  const {
    role,
    getHints,
    inboxByRole,
    threads,
    selectedInboxId,
    setSelectedInboxId,
    appendChatMessage,
    openModal,
  } = useBridge();
  const hints = getHints();
  const [input, setInput] = useState('');

  const items = inboxByRole[role];
  const inboxKey = items.map((i) => i.id).join(',');

  useEffect(() => {
    const list = inboxByRole[role];
    if (!list.length) {
      setSelectedInboxId(null);
      return;
    }
    setSelectedInboxId((cur) => (cur && list.some((i) => i.id === cur) ? cur : list[0]!.id));
  }, [role, inboxKey, inboxByRole, setSelectedInboxId]);

  const threadId = selectedInboxId && items.some((i) => i.id === selectedInboxId) ? selectedInboxId : items[0]?.id;
  const current = items.find((i) => i.id === threadId);
  const msgs = threadId ? threads[threadId] ?? [] : [];

  const placeholder =
    role === 'parent'
      ? 'Type a message to your teacher…'
      : role === 'teacher'
        ? 'Type a message to this family or class…'
        : 'Type a message…';

  const send = () => {
    const v = input.trim();
    if (!v || !threadId) return;
    appendChatMessage(threadId, { who: 'You', type: 'out', text: v });
    setInput('');
  };

  return (
    <section
      className={cx('panel', 'panel--chat', active && 'is-visible')}
      id="panel-chat"
      data-panel="chat"
      role="region"
      aria-labelledby="panel-chat-title"
      hidden={!active}
    >
      <PanelHeader
        titleId="panel-chat-title"
        title="Chat"
        hint={hints.chat}
        hintId="chat-role-hint"
        split
        end={
          <Button
            variant="primary"
            pill
            className="btn--sm"
            id="btn-broadcast"
            hidden={role !== 'teacher'}
            onClick={() => openModal({ type: 'broadcast' })}
          >
            Broadcast
          </Button>
        }
      />

      <div className="chat-layout chat-layout--rounded">
        <div className="inbox" id="inbox-list">
          {!items.length ? (
            <p className="panel__hint" style={{ padding: '1rem' }}>
              No messages yet.
            </p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cx('inbox-item', item.id === threadId && 'is-active')}
                data-id={item.id}
                onClick={() => setSelectedInboxId(item.id)}
              >
                <div className="inbox-item__title">{item.title}</div>
                <div className="inbox-item__meta">{item.date}</div>
              </button>
            ))
          )}
        </div>
        <div className="thread-pane">
          <div className="thread-header">
            <h3 className="thread-title" id="thread-title">
              {current?.title ?? 'Select a thread'}
            </h3>
            <Button
              variant="secondary"
              pill
              className="btn--sm"
              id="btn-book-teacher"
              hidden={role !== 'parent'}
              onClick={() => openModal({ type: 'book' })}
            >
              Book a time
            </Button>
          </div>
          <div className="msg-thread" id="msg-thread">
            {!msgs.length ? (
              <p className="panel__hint">No messages in this thread (demo).</p>
            ) : (
              msgs.map((m, idx) => (
                <div key={`${idx}-${m.who}`} className={cx('msg', m.type === 'out' ? 'msg--out' : 'msg--in')}>
                  <div className="msg__who">{m.who}</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                </div>
              ))
            )}
          </div>
          <Composer
            inputId="chat-input"
            className="chat-composer"
            label="Message"
            value={input}
            onChange={setInput}
            placeholder={placeholder}
            actions={
              <Button variant="primary" pill className="btn--sm" id="chat-send" onClick={send}>
                Send
              </Button>
            }
          />
        </div>
      </div>
    </section>
  );
}
