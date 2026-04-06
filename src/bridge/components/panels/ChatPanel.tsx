import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus } from 'lucide-react';
import type { InboxItem } from '@/bridge/types';
import { isBroadcastFeedThreadId } from '@/bridge/broadcast-inbox-ids';
import { buildChatInboxItems, buildFeedInboxItems, type ChatInboxRow } from '@/bridge/chat-inbox-mock';
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

function formatClockLabel(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
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

function ChatInboxChatRowContent({ row }: { row: ChatInboxRow }) {
  const { t } = useTranslation();
  return (
    <div className="inbox-item__block">
      <div className="inbox-item__meta-row">
        <span
          className={cx(
            'inbox-item__kind',
            row.section === 'group' ? 'inbox-item__kind--group' : 'inbox-item__kind--private',
          )}
        >
          {row.section === 'group' ? t('chat.inboxKindGroup') : t('chat.inboxKindPrivate')}
        </span>
        <time className="inbox-item__meta" dateTime={row.date}>
          {row.date}
        </time>
      </div>
      <span className="inbox-item__headline">{row.title}</span>
    </div>
  );
}

export function ChatPanel({ active }: { active: boolean }) {
  const { t, i18n } = useTranslation();
  const formatClockTime = useMemo(
    () => (iso: string) => formatClockLabel(iso, i18n.language),
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
  const feedItems = useMemo(() => buildFeedInboxItems(inboxItems), [inboxItems]);
  const chatItems = useMemo(() => buildChatInboxItems(role, inboxItems), [role, inboxItems]);
  const orderedIds = useMemo(() => {
    return [
      ...feedItems.map((i) => i.id),
      ...chatItems.map((r) => r.id),
    ];
  }, [feedItems, chatItems]);

  useEffect(() => {
    if (!orderedIds.length) {
      setSelectedInboxId(null);
      return;
    }
    setSelectedInboxId((cur) => (cur && orderedIds.includes(cur) ? cur : orderedIds[0]!));
  }, [role, inboxKey, orderedIds, setSelectedInboxId]);

  const threadId =
    selectedInboxId && orderedIds.includes(selectedInboxId) ? selectedInboxId : orderedIds[0];
  const currentFeed = feedItems.find((i) => i.id === threadId);
  const currentChat = chatItems.find((r) => r.id === threadId);
  const isGroupThread = currentChat?.section === 'group';
  const msgs = threadId ? threads[threadId] ?? [] : [];

  const showComposer =
    !!threadId &&
    (currentChat != null ||
      (!!currentFeed && currentFeed.kind !== 'report' && currentFeed.kind !== 'broadcast'));

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

  const hasChatBlock = chatItems.length > 0;

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
        <div className="inbox inbox--split" id="inbox-list">
          {!orderedIds.length ? (
            <p className="panel__hint" style={{ padding: '1rem' }}>
              {t('chat.emptyInbox')}
            </p>
          ) : (
            <>
              {feedItems.length > 0 ? (
                <div className="inbox-feed" role="group" aria-label={t('chat.inboxFeedAria')}>
                  {feedItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cx(
                        'inbox-item',
                        item.id === threadId && 'is-active',
                        item.kind === 'broadcast' &&
                          isBroadcastFeedThreadId(item.id) &&
                          'inbox-item--broadcast-feed',
                      )}
                      data-id={item.id}
                      onClick={() => setSelectedInboxId(item.id)}
                    >
                      <ChatInboxItemContent item={item} />
                    </button>
                  ))}
                </div>
              ) : null}

              {hasChatBlock ? (
                <div className="inbox-chat-wrap">
                  <div className="inbox-split-heading">{t('chat.inboxSectionChats')}</div>
                  <div role="group" aria-label={t('chat.inboxChatAria')}>
                    {chatItems.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        className={cx('inbox-item', 'inbox-item--chat', row.id === threadId && 'is-active')}
                        data-id={row.id}
                        onClick={() => setSelectedInboxId(row.id)}
                      >
                        <ChatInboxChatRowContent row={row} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
        <div className="thread-pane">
          <div className="thread-header">
            <h3
              className={cx(
                'thread-title',
                currentFeed &&
                  (currentFeed.kind === 'report' || currentFeed.kind === 'broadcast') &&
                  'thread-title--stacked',
              )}
              id="thread-title"
            >
              {currentFeed ? (
                <>
                  {(currentFeed.kind === 'report' || currentFeed.kind === 'broadcast') && (
                    <div className="thread-title__meta-row">
                      <span
                        className={cx(
                          'inbox-item__kind',
                          currentFeed.kind === 'report'
                            ? 'inbox-item__kind--report'
                            : 'inbox-item__kind--broadcast',
                        )}
                      >
                        {currentFeed.kind === 'report'
                          ? t('chat.inboxKindReport')
                          : t('chat.inboxKindBroadcast')}
                      </span>
                    </div>
                  )}
                  <span className="thread-title__text">
                    {currentFeed.kind === 'broadcast' && isBroadcastFeedThreadId(currentFeed.id)
                      ? t('chat.inboxBroadcastFeedTitle')
                      : currentFeed.title}
                  </span>
                </>
              ) : currentChat ? (
                <>
                  <div className="thread-title__meta-row">
                    <span
                      className={cx(
                        'inbox-item__kind',
                        currentChat.section === 'group'
                          ? 'inbox-item__kind--group'
                          : 'inbox-item__kind--private',
                      )}
                    >
                      {currentChat.section === 'group'
                        ? t('chat.inboxKindGroup')
                        : t('chat.inboxKindPrivate')}
                    </span>
                  </div>
                  <span className="thread-title__text">{currentChat.title}</span>
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
                const showTeacherSpeakerLabel =
                  isGroupThread &&
                  (m.speakerRole === 'teacher' ||
                    (m.who === 'You'
                      ? role === 'teacher'
                      : /^(Ms\.?|Mr\.?|Mrs\.?|Teacher\b)/i.test(m.who.trim())));
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
                        <span className="msg__who-meta">
                          <span className="msg__who">{whoLabel}</span>
                          {showTeacherSpeakerLabel ? (
                            <span className="msg__role-tag">{t('roles.teacher')}</span>
                          ) : null}
                        </span>
                        {m.broadcastPost.sentAt ? (
                          <time className="msg__time" dateTime={m.broadcastPost.sentAt}>
                            {formatClockTime(m.broadcastPost.sentAt)}
                          </time>
                        ) : null}
                      </div>
                    ) : (
                      <div className="msg__broadcast-meta">
                        <span className="msg__who-meta">
                          <span className="msg__who">{whoLabel}</span>
                          {showTeacherSpeakerLabel ? (
                            <span className="msg__role-tag">{t('roles.teacher')}</span>
                          ) : null}
                        </span>
                        {m.sentAt ? (
                          <time className="msg__time" dateTime={m.sentAt}>
                            {formatClockTime(m.sentAt)}
                          </time>
                        ) : null}
                      </div>
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
                    <Button variant="primary" pill className="btn--sm" id="chat-send" onClick={() => send()}>
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
