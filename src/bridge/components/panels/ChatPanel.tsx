import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus } from 'lucide-react';
import type { InboxItem } from '@/bridge/types';
import { isBroadcastFeedThreadId } from '@/bridge/broadcast-inbox-ids';
import { useBridge } from '@/bridge/BridgeContext';
import { panelHintsForRole } from '@/bridge/panelHints';
import { ChatLearningCardMessage } from '@/bridge/components/ChatLearningCardMessage';
import { ChatTeacherReportMessage } from '@/bridge/components/ChatTeacherReportMessage';
import { MessageAttachmentGrid } from '@/bridge/components/MessageAttachmentGrid';
import { Button } from '@/bridge/components/ui/Button';
import { Composer } from '@/bridge/components/ui/Composer';
import { PanelHeader } from '@/bridge/components/ui/PanelHeader';
import { cx } from '@/bridge/cx';
import { MAX_MESSAGE_IMAGES, usePendingImageAttachments } from '@/bridge/usePendingImageAttachments';

function formatBroadcastClockLabel(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}

/** One broadcast row + other threads (broadcasts are merged into a single feed per role). */
function buildDisplayInboxItems(items: InboxItem[]): InboxItem[] {
  const byDateDesc = (a: InboxItem, b: InboxItem) => {
    const c = b.date.localeCompare(a.date);
    return c !== 0 ? c : b.id.localeCompare(a.id);
  };
  const broadcast =
    items.find((i) => i.kind === 'broadcast' && isBroadcastFeedThreadId(i.id)) ??
    items.find((i) => i.kind === 'broadcast');
  const others = items.filter((i) => i.kind !== 'broadcast').sort(byDateDesc);
  return broadcast ? [broadcast, ...others] : others;
}

function ChatInboxItemContent({ item }: { item: InboxItem }) {
  const { t } = useTranslation();
  const showKind = item.kind === 'report' || item.kind === 'broadcast';
  const headline =
    item.kind === 'broadcast' && isBroadcastFeedThreadId(item.id)
      ? t('chat.inboxBroadcastFeedTitle')
      : item.title;
  return (
    <div className="inbox-item__block">
      <div className="inbox-item__meta-row">
        {showKind ? (
          <span
            className={cx(
              'inbox-item__kind',
              item.kind === 'report' ? 'inbox-item__kind--report' : 'inbox-item__kind--broadcast',
            )}
          >
            {item.kind === 'report' ? t('chat.inboxKindReport') : t('chat.inboxKindBroadcast')}
          </span>
        ) : null}
        <time className="inbox-item__meta" dateTime={item.date}>
          {item.date}
        </time>
      </div>
      <span className="inbox-item__headline">{headline}</span>
    </div>
  );
}

export function ChatPanel({ active }: { active: boolean }) {
  const { t, i18n } = useTranslation();
  const formatBroadcastTime = useMemo(
    () => (iso: string) => formatBroadcastClockLabel(iso, i18n.language),
    [i18n.language],
  );
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
  const inboxItems = inboxByRole[role];
  const inboxKey = inboxItems.map((i) => i.id).join(',');
  const displayItems = useMemo(() => buildDisplayInboxItems(inboxItems), [inboxItems]);

  useEffect(() => {
    if (!displayItems.length) {
      setSelectedInboxId(null);
      return;
    }
    setSelectedInboxId((cur) =>
      cur && displayItems.some((i) => i.id === cur) ? cur : displayItems[0]!.id,
    );
  }, [role, inboxKey, inboxByRole, displayItems, setSelectedInboxId]);

  const threadId =
    selectedInboxId && displayItems.some((i) => i.id === selectedInboxId)
      ? selectedInboxId
      : displayItems[0]?.id;
  const current = displayItems.find((i) => i.id === threadId);
  const msgs = threadId ? threads[threadId] ?? [] : [];

  /** Report + broadcast feeds are read-only (no back-and-forth in this panel). */
  const showComposer =
    !!current && current.kind !== 'report' && current.kind !== 'broadcast';

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
          {!displayItems.length ? (
            <p className="panel__hint" style={{ padding: '1rem' }}>
              {t('chat.emptyInbox')}
            </p>
          ) : (
            displayItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cx('inbox-item', item.id === threadId && 'is-active')}
                data-id={item.id}
                onClick={() => setSelectedInboxId(item.id)}
              >
                <ChatInboxItemContent item={item} />
              </button>
            ))
          )}
        </div>
        <div className="thread-pane">
          <div className="thread-header">
            <h3
              className={cx(
                'thread-title',
                current &&
                  (current.kind === 'report' || current.kind === 'broadcast') &&
                  'thread-title--stacked',
              )}
              id="thread-title"
            >
              {current ? (
                <>
                  {(current.kind === 'report' || current.kind === 'broadcast') && (
                    <div className="thread-title__meta-row">
                      <span
                        className={cx(
                          'inbox-item__kind',
                          current.kind === 'report' ? 'inbox-item__kind--report' : 'inbox-item__kind--broadcast',
                        )}
                      >
                        {current.kind === 'report' ? t('chat.inboxKindReport') : t('chat.inboxKindBroadcast')}
                      </span>
                    </div>
                  )}
                  <span className="thread-title__text">
                    {current.kind === 'broadcast' && isBroadcastFeedThreadId(current.id)
                      ? t('chat.inboxBroadcastFeedTitle')
                      : current.title}
                  </span>
                </>
              ) : (
                t('chat.selectThread')
              )}
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
              msgs.map((m, idx) => {
                const whoLabel =
                  m.who === 'You' ? t('common.you') : m.who === 'BridgeEd AI' ? t('common.bridgedAi') : m.who;
                return (
                <div
                  key={`${idx}-${m.who}-${m.broadcastPost?.sentAt ?? ''}-${m.broadcastPost?.title ?? ''}-${m.learningCard?.id ?? ''}-${m.teacherReport?.title ?? ''}`}
                  className={cx(
                    'msg',
                    m.type === 'out' ? 'msg--out' : 'msg--in',
                    m.learningCard && 'msg--learning-card',
                    m.teacherReport && 'msg--teacher-report',
                    m.broadcastPost && 'msg--broadcast',
                  )}
                >
                  {m.broadcastPost ? (
                    <div className="msg__broadcast-meta">
                      <span className="msg__who">{whoLabel}</span>
                      {m.broadcastPost.sentAt ? (
                        <time className="msg__time" dateTime={m.broadcastPost.sentAt}>
                          {formatBroadcastTime(m.broadcastPost.sentAt)}
                        </time>
                      ) : null}
                    </div>
                  ) : (
                    <div className="msg__who">{whoLabel}</div>
                  )}
                  <MessageAttachmentGrid attachments={m.attachments} />
                  {m.learningCard ? (
                    <ChatLearningCardMessage card={m.learningCard} />
                  ) : m.teacherReport ? (
                    <ChatTeacherReportMessage report={m.teacherReport} />
                  ) : m.broadcastPost ? (
                    <div className="msg__broadcast-card">
                      <div className="msg__broadcast-title">{m.broadcastPost.title}</div>
                      <div className="msg__broadcast-body">{m.broadcastPost.body}</div>
                    </div>
                  ) : m.text?.trim() ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                  ) : null}
                </div>
                );
              })
            )}
          </div>
          {showComposer ? (
            <>
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
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
