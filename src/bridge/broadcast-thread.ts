import type { TeacherBroadcastPayload, ThreadMessage } from '@/bridge/types';
import type { BroadcastBackend } from '@/data/entity/broadcast-backend';
import type { UserBackend } from '@/data/entity/user-backend';

export function displayNameForUserId(users: UserBackend[], userId: string): string {
  const u = users.find((x) => x.id === userId);
  return (u?.name?.trim() || u?.email?.trim() || userId).trim();
}

/** One inbound chat line for a class broadcast (same for live send and IndexedDB hydration). */
export function threadMessageFromTeacherBroadcastPayload(
  payload: TeacherBroadcastPayload,
  sentAtIso: string | undefined,
  authorUserId: string,
  users: UserBackend[],
): ThreadMessage {
  const { title, body } = payload;
  const trimmed = body.trim();
  const t = title.trim();
  const fallback = trimmed || t;
  const plain = fallback.length > 600 ? `${fallback.slice(0, 600)}…` : fallback;
  const sentAt = sentAtIso?.trim() || new Date().toISOString();
  const who = displayNameForUserId(users, authorUserId);
  return {
    who,
    type: 'in',
    text: plain || '\u00a0',
    authorUserId,
    broadcastPost: { title: t || plain, body: trimmed, sentAt },
  };
}

export function threadMessageFromBroadcastBackend(b: BroadcastBackend, users: UserBackend[]): ThreadMessage {
  return threadMessageFromTeacherBroadcastPayload(
    {
      title: b.title,
      body: b.body,
      toStudents: b.audience.toStudents,
      toParents: b.audience.toParents,
    },
    b.sentAt,
    b.authorUserId,
    users,
  );
}

/**
 * Teacher’s merged broadcast feed: same card body as parent/student, shown as self-sent (outgoing).
 */
export function threadMessageFromBroadcastBackendTeacherView(
  b: BroadcastBackend,
  users: UserBackend[],
): ThreadMessage {
  const m = threadMessageFromBroadcastBackend(b, users);
  return { ...m, who: 'You', type: 'out' };
}
