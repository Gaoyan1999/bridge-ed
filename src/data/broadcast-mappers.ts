import { BROADCAST_SCHEMA_VERSION, type BroadcastBackend } from './entity/broadcast-backend';

export function normalizeBroadcastBackend(raw: unknown): BroadcastBackend {
  if (!raw || typeof raw !== 'object') {
    throw new Error('BroadcastBackend: expected an object');
  }
  const r = raw as Partial<BroadcastBackend> & { id?: string };
  const id = typeof r.id === 'string' ? r.id : '';
  if (!id) throw new Error('BroadcastBackend: missing id');

  const now = new Date().toISOString();
  const aud: Record<string, unknown> =
    r.audience && typeof r.audience === 'object' && !Array.isArray(r.audience)
      ? (r.audience as Record<string, unknown>)
      : {};

  return {
    id,
    schemaVersion: BROADCAST_SCHEMA_VERSION,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
    authorUserId: typeof r.authorUserId === 'string' ? r.authorUserId : 'unknown',
    sentAt: typeof r.sentAt === 'string' ? r.sentAt : now,
    title: typeof r.title === 'string' ? r.title : '',
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
