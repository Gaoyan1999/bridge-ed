import type { TeacherReportPayload } from '@/bridge/types';
import { TeacherReportContent } from '@/bridge/components/TeacherReportContent';

/** Class report in a Messages thread — same layout as the teacher preview modal. */
export function ChatTeacherReportMessage({ report }: { report: TeacherReportPayload }) {
  return <TeacherReportContent report={report} variant="thread" />;
}
