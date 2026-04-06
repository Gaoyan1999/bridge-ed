/** Single inbox row + thread key for all class broadcasts to parents (messages append here). */
export const BROADCAST_FEED_THREAD_ID_PARENT = 'broadcast-feed-parent';

/** Same for student-facing broadcast feed. */
export const BROADCAST_FEED_THREAD_ID_STUDENT = 'broadcast-feed-student';

export function isBroadcastFeedThreadId(id: string): boolean {
  return id === BROADCAST_FEED_THREAD_ID_PARENT || id === BROADCAST_FEED_THREAD_ID_STUDENT;
}
