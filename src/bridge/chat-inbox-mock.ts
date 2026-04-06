import { isBroadcastFeedThreadId } from '@/bridge/broadcast-inbox-ids';
import type { InboxItem, Role } from '@/bridge/types';

/** UI-only rows for the Messages sidebar (group vs private). Chat content is mocked in `INITIAL_THREADS`. */
export type ChatInboxRow = {
  id: string;
  title: string;
  date: string;
  /** `group` = 群聊, `private` = 私聊 */
  section: 'group' | 'private';
  /** Inbox kind label override (e.g. booking requests). */
  inboxKind?: 'booking' | 'dm';
};

const MOCK_GROUPS: Record<Role, ChatInboxRow[]> = {
  parent: [
    {
      id: 'mock-chat-parent-g1',
      title: 'Math 9 · Class group',
      date: '2026-04-05',
      section: 'group',
    },
  ],
  student: [
    {
      id: 'mock-chat-student-g1',
      title: 'Math 9 · Study group',
      date: '2026-04-04',
      section: 'group',
    },
  ],
  teacher: [
    {
      id: 'mock-chat-teacher-g1',
      title: 'Math 9 · Class group',
      date: '2026-04-06',
      section: 'group',
    },
    {
      id: 'mock-chat-teacher-g2',
      title: 'Dept — Curriculum',
      date: '2026-04-02',
      section: 'group',
    },
  ],
};

const MOCK_PRIVATE: Record<Role, ChatInboxRow[]> = {
  parent: [
    {
      id: 'mock-chat-parent-p1',
      title: 'PTA — Spring picnic',
      date: '2026-04-01',
      section: 'private',
    },
  ],
  student: [
    {
      id: 'mock-chat-student-p1',
      title: 'Ms. Lee',
      date: '2026-03-30',
      section: 'private',
    },
  ],
  teacher: [],
};

function byDateDesc(a: { date: string; id: string }, b: { date: string; id: string }): number {
  const c = b.date.localeCompare(a.date);
  return c !== 0 ? c : a.id.localeCompare(b.id);
}

/** One merged broadcast row + class reports (newest first). */
export function buildFeedInboxItems(items: InboxItem[]): InboxItem[] {
  const reports = items.filter((i) => i.kind === 'report').sort(byDateDesc);
  const broadcast =
    items.find((i) => i.kind === 'broadcast' && isBroadcastFeedThreadId(i.id)) ??
    items.find((i) => i.kind === 'broadcast');
  return broadcast ? [broadcast, ...reports] : reports;
}

function inboxItemToChatRow(item: InboxItem): ChatInboxRow | null {
  if (item.kind === 'report' || item.kind === 'broadcast') return null;
  return {
    id: item.id,
    title: item.title,
    date: item.date,
    section: 'private',
    inboxKind: item.kind === 'booking' ? 'booking' : item.kind === 'dm' ? 'dm' : undefined,
  };
}

/**
 * Merge persisted inbox rows (DM / booking / draft) with mock group + private chats for sidebar UI.
 */
export function buildChatInboxItems(role: Role, inboxItems: InboxItem[]): ChatInboxRow[] {
  const fromInbox = inboxItems
    .map(inboxItemToChatRow)
    .filter((r): r is ChatInboxRow => r !== null)
    .sort(byDateDesc);

  const seen = new Set<string>();
  const merged: ChatInboxRow[] = [];
  for (const row of [...fromInbox, ...MOCK_GROUPS[role], ...MOCK_PRIVATE[role]]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }
  merged.sort(byDateDesc);
  return merged;
}
