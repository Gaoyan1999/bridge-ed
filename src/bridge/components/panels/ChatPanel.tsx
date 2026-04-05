import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus } from 'lucide-react';
import { useBridge } from '@/bridge/BridgeContext';
import { panelHintsForRole } from '@/bridge/panelHints';
import { ChatLearningCardMessage } from '@/bridge/components/ChatLearningCardMessage';
import { MessageAttachmentGrid } from '@/bridge/components/MessageAttachmentGrid';
import { Button } from '@/bridge/components/ui/Button';
import { Composer } from '@/bridge/components/ui/Composer';
import { PanelHeader } from '@/bridge/components/ui/PanelHeader';
import { cx } from '@/bridge/cx';
import { MAX_MESSAGE_IMAGES, usePendingImageAttachments } from '@/bridge/usePendingImageAttachments';

export function ChatPanel({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const {
    role,
    inboxByRole,
    threads,
    selectedInboxId,
    setSelectedInboxId,
    appendChatMessage,
    openModal,
  } = useBridge();
  const hints = panelHintsForRole(t, role);
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
      ? t('chat.placeholderParent')
      : role === 'teacher'
        ? t('chat.placeholderTeacher')
        : t('chat.placeholderStudent');

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
        title={t('panels.messages')}
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
            {t('chat.broadcast')}
          </Button>
        }
      />

      <div className="chat-layout chat-layout--rounded">
        <div className="inbox" id="inbox-list">
          {!items.length ? (
            <p className="panel__hint" style={{ padding: '1rem' }}>
              {t('chat.emptyInbox')}
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
              {current?.title ?? t('chat.selectThread')}
            </h3>
            <Button
              variant="secondary"
              pill
              className="btn--sm"
              id="btn-book-teacher"
              hidden={role !== 'parent'}
              onClick={() => openModal({ type: 'book' })}
            >
              {t('chat.bookTime')}
            </Button>
          </div>
          <div className="msg-thread" id="msg-thread">
            {!msgs.length ? (
              <p className="panel__hint">{t('chat.noMessagesInThread')}</p>
            ) : (
              msgs.map((m, idx) => (
                <div
                  key={`${idx}-${m.who}-${m.learningCard?.id ?? ''}`}
                  className={cx(
                    'msg',
                    m.type === 'out' ? 'msg--out' : 'msg--in',
                    m.learningCard && 'msg--learning-card',
                  )}
                >
                  <div className="msg__who">
                    {m.who === 'You' ? t('common.you') : m.who === 'BridgeEd AI' ? t('common.bridgedAi') : m.who}
                  </div>
                  <MessageAttachmentGrid attachments={m.attachments} />
                  {m.learningCard ? (
                    <ChatLearningCardMessage card={m.learningCard} />
                  ) : m.text?.trim() ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                  ) : null}
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
            label={t('common.message')}
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
                <Button
                  variant="primary"
                  pill
                  className="btn--sm"
                id="chat-send"
                onClick={() => send()}
              >
                  {t('common.send')}
                </Button>
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}
