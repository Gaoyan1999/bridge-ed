import type { TeacherReportPayload, ThreadMessage } from '@/bridge/types';
import type { ReportBackend } from '@/data/entity/report-backend';

/** One inbound chat line for a class report (same for live send and IndexedDB hydration). */
export function threadMessageFromTeacherReportPayload(payload: TeacherReportPayload): ThreadMessage {
  const { title, summary, body, toStudents, toParents } = payload;
  const trimmed = [summary.trim(), body.trim()].filter(Boolean).join('\n\n').trim();
  const plainFallback = trimmed.length > 600 ? `${trimmed.slice(0, 600)}…` : trimmed;
  return {
    who: 'Ms. Lee',
    type: 'in',
    text: plainFallback,
    teacherReport: { title, summary, body, toStudents, toParents },
  };
}

export function threadMessageFromReportBackend(r: ReportBackend): ThreadMessage {
  return threadMessageFromTeacherReportPayload({
    title: r.title,
    summary: r.summary,
    body: r.body,
    toStudents: r.audience.toStudents,
    toParents: r.audience.toParents,
  });
}
