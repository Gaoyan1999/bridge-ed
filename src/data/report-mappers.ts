import { REPORT_SCHEMA_VERSION, type ReportBackend } from './entity/report-backend';

export function normalizeReportBackend(raw: unknown): ReportBackend {
  if (!raw || typeof raw !== 'object') {
    throw new Error('ReportBackend: expected an object');
  }
  const r = raw as Partial<ReportBackend> & { id?: string };
  const id = typeof r.id === 'string' ? r.id : '';
  if (!id) throw new Error('ReportBackend: missing id');

  const now = new Date().toISOString();
  const aud: Record<string, unknown> =
    r.audience && typeof r.audience === 'object' && !Array.isArray(r.audience)
      ? (r.audience as Record<string, unknown>)
      : {};

  return {
    id,
    schemaVersion: REPORT_SCHEMA_VERSION,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
    authorUserId: typeof r.authorUserId === 'string' ? r.authorUserId : 'unknown',
    sentAt: typeof r.sentAt === 'string' ? r.sentAt : now,
    title: typeof r.title === 'string' ? r.title : '',
    summary: typeof r.summary === 'string' ? r.summary : '',
    body: typeof r.body === 'string' ? r.body : '',
    audience: {
      toStudents: typeof aud.toStudents === 'boolean' ? aud.toStudents : false,
      toParents: typeof aud.toParents === 'boolean' ? aud.toParents : false,
    },
    messageThreadIds: (() => {
      const mt = r.messageThreadIds && typeof r.messageThreadIds === 'object' ? r.messageThreadIds : null;
      if (!mt) return undefined;
      const out: { student?: string; parent?: string } = {};
      if (typeof mt.student === 'string') out.student = mt.student;
      if (typeof mt.parent === 'string') out.parent = mt.parent;
      return Object.keys(out).length > 0 ? out : undefined;
    })(),
  };
}
