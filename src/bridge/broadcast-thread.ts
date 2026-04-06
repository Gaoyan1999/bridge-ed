import type { TeacherBroadcastPayload, ThreadMessage } from '@/bridge/types';
import type { BroadcastBackend } from '@/data/entity/broadcast-backend';

/** One inbound chat line for a class broadcast (same for live send and IndexedDB hydration). */
export function threadMessageFromTeacherBroadcastPayload(payload: TeacherBroadcastPayload): ThreadMessage {
  const { title, body } = payload;
  const trimmed = body.trim();
  const fallback = trimmed || title.trim();
  const plain = fallback.length > 600 ? `${fallback.slice(0, 600)}…` : fallback;
  return {
    who: 'Ms. Lee',
    type: 'in',
    text: plain || '\u00a0',
  };
}

export function threadMessageFromBroadcastBackend(b: BroadcastBackend): ThreadMessage {
  return threadMessageFromTeacherBroadcastPayload({
    title: b.title,
    body: b.body,
    toStudents: b.audience.toStudents,
    toParents: b.audience.toParents,
  });
}
