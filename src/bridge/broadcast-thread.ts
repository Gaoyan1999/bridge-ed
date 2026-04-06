import type { TeacherBroadcastPayload, ThreadMessage } from '@/bridge/types';
import type { BroadcastBackend } from '@/data/entity/broadcast-backend';

/** One inbound chat line for a class broadcast (same for live send and IndexedDB hydration). */
export function threadMessageFromTeacherBroadcastPayload(
  payload: TeacherBroadcastPayload,
  sentAtIso?: string,
): ThreadMessage {
  const { title, body } = payload;
  const trimmed = body.trim();
  const t = title.trim();
  const fallback = trimmed || t;
  const plain = fallback.length > 600 ? `${fallback.slice(0, 600)}…` : fallback;
  const sentAt = sentAtIso?.trim() || new Date().toISOString();
  return {
    who: 'Ms. Lee',
    type: 'in',
    text: plain || '\u00a0',
    broadcastPost: { title: t || plain, body: trimmed, sentAt },
  };
}

export function threadMessageFromBroadcastBackend(b: BroadcastBackend): ThreadMessage {
  return threadMessageFromTeacherBroadcastPayload(
    {
      title: b.title,
      body: b.body,
      toStudents: b.audience.toStudents,
      toParents: b.audience.toParents,
    },
    b.sentAt,
  );
}
