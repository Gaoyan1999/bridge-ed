<<<<<<< Updated upstream
import { useEffect, useState } from 'react';
=======
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus } from 'lucide-react';
>>>>>>> Stashed changes
import { useBridge } from '@/bridge/BridgeContext';
import { MessageAttachmentGrid } from '@/bridge/components/MessageAttachmentGrid';
import { Button } from '@/bridge/components/ui/Button';
import { Composer } from '@/bridge/components/ui/Composer';
import { PanelHeader } from '@/bridge/components/ui/PanelHeader';
import { cx } from '@/bridge/cx';
import { MAX_MESSAGE_IMAGES, usePendingImageAttachments } from '@/bridge/usePendingImageAttachments';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { pending, addFromFileList, remove, clear } = usePendingImageAttachments({
    onReject: (reason) => {
      if (reason === 'size') window.alert(t('common.imageTooLarge'));
      else if (reason === 'max') window.alert(t('common.maxImages', { count: MAX_MESSAGE_IMAGES }));
      else if (reason === 'type') window.alert(t('common.imagesOnly'));
    },
  });

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
    const attachments =
      pending.length > 0
        ? pending.map((p) => ({ kind: 'image' as const, url: p.dataUrl, name: p.name }))
        : undefined;
    if ((!v && !attachments?.length) || !threadId) return;
    appendChatMessage(threadId, {
      who: 'You',
      type: 'out',
      text: v,
      ...(attachments ? { attachments } : {}),
    });
    setInput('');
    clear();
    if (fileInputRef.current) fileInputRef.current.value = '';
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
        title="Messages"
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
<<<<<<< Updated upstream
                  <div className="msg__who">{m.who}</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
=======
                  <div className="msg__who">
                    {m.who === 'You' ? t('common.you') : m.who === 'BridgeEd AI' ? t('common.bridgedAi') : m.who}
                  </div>
                  <MessageAttachmentGrid attachments={m.attachments} />
                  {m.text?.trim() ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                  ) : null}
>>>>>>> Stashed changes
                </div>
              ))
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            id="chat-file-input"
            aria-hidden
            tabIndex={-1}
            onChange={(e) => {
              void addFromFileList(e.target.files);
              e.target.value = '';
            }}
          />
          <Composer
            inputId="chat-input"
            className="chat-composer"
            label="Message"
            value={input}
            onChange={setInput}
            placeholder={placeholder}
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
<<<<<<< Updated upstream
              <Button variant="primary" pill className="btn--sm" id="chat-send" onClick={send}>
                Send
              </Button>
=======
              <>
                <Button
                  type="button"
                  variant="text"
                  className="btn--sm composer__attach-btn"
                  id="chat-attach-image"
                  aria-label={t('common.attachImage')}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus strokeWidth={2} size={20} aria-hidden />
                </Button>
                <Button variant="primary" pill className="btn--sm" id="chat-send" onClick={send}>
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
