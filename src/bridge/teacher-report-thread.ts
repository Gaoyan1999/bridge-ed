import { displayNameForUserId } from '@/bridge/broadcast-thread';
import type { TeacherReportPayload, ThreadMessage } from '@/bridge/types';
import type { ReportBackend } from '@/data/entity/report-backend';
import type { UserBackend } from '@/data/entity/user-backend';

/** One inbound chat line for a class report (same for live send and IndexedDB hydration). */
export function threadMessageFromTeacherReportPayload(
  payload: TeacherReportPayload,
  authorUserId: string,
  users: UserBackend[],
): ThreadMessage {
  const { title, summary, body, toStudents, toParents } = payload;
  const trimmed = [summary.trim(), body.trim()].filter(Boolean).join('\n\n').trim();
  const plainFallback = trimmed.length > 600 ? `${trimmed.slice(0, 600)}…` : trimmed;
  const who = displayNameForUserId(users, authorUserId);
  return {
    who,
    type: 'in',
    text: plainFallback,
    authorUserId,
    teacherReport: { title, summary, body, toStudents, toParents },
  };
}

export function threadMessageFromReportBackend(r: ReportBackend, users: UserBackend[]): ThreadMessage {
  return threadMessageFromTeacherReportPayload(
    {
      title: r.title,
      summary: r.summary,
      body: r.body,
      toStudents: r.audience.toStudents,
      toParents: r.audience.toParents,
    },
    r.authorUserId,
    users,
  );
}
