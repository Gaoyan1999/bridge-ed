import { pleasantToStudentMoodKind } from '@/bridge/moodUtils';
import {
  STUDENT_MOOD_KINDS,
  STUDENT_MOOD_SCHEMA_VERSION,
  type StudentMoodBackend,
  type StudentMoodKind,
} from './entity/student-mood-backend';

/** Deterministic id per student + local day (upsert same day). */
export function studentMoodStableId(studentId: string, localDate: string): string {
  return `sm:${studentId}:${localDate}`;
}

function isStudentMoodKind(v: unknown): v is StudentMoodKind {
  return typeof v === 'string' && (STUDENT_MOOD_KINDS as readonly string[]).includes(v);
}

type RawStudentMood = Partial<StudentMoodBackend> & {
  label?: string;
  /** Legacy v2 — ignored when normalizing. */
  studentDisplayName?: string;
  /** Legacy v3 — duplicate of `studentId`; ignored when normalizing. */
  authorUserId?: string;
};

/**
 * Normalize legacy rows (v1 had `label`; v2 had `studentDisplayName`; v3 had `authorUserId`).
 * Strips deprecated fields; output is always current schema.
 */
export function normalizeStudentMoodBackend(raw: RawStudentMood): StudentMoodBackend {
  const pleasant = Math.max(0, Math.min(100, Math.round(raw.pleasant ?? 50)));
  const mood: StudentMoodKind = isStudentMoodKind(raw.mood) ? raw.mood : pleasantToStudentMoodKind(pleasant);

  const reasonTags = Array.isArray(raw.reasonTags)
    ? raw.reasonTags.filter((x): x is string => typeof x === 'string')
    : undefined;
  const otherDetail = typeof raw.otherDetail === 'string' ? raw.otherDetail : undefined;

  return {
    id: raw.id!,
    schemaVersion: STUDENT_MOOD_SCHEMA_VERSION,
    studentId: raw.studentId!,
    localDate: raw.localDate!,
    pleasant,
    mood,
    note: typeof raw.note === 'string' ? raw.note : '',
    ...(reasonTags?.length ? { reasonTags } : {}),
    ...(otherDetail !== undefined && otherDetail !== '' ? { otherDetail } : {}),
    createdAt: raw.createdAt!,
    updatedAt: raw.updatedAt!,
  };
}

export function buildStudentMoodFromCheckIn(params: {
  studentId: string;
  pleasant: number;
  note: string;
  localDate: string;
  reasonTags?: string[];
  otherDetail?: string;
}): StudentMoodBackend {
  const now = new Date().toISOString();
  const id = studentMoodStableId(params.studentId, params.localDate);
  const pleasant = Math.max(0, Math.min(100, Math.round(params.pleasant)));
  const tags = params.reasonTags?.filter((x) => typeof x === 'string' && x.trim()) ?? [];
  const otherDetail =
    tags.includes('other') && typeof params.otherDetail === 'string' ? params.otherDetail.trim() : undefined;
  return {
    id,
    schemaVersion: STUDENT_MOOD_SCHEMA_VERSION,
    studentId: params.studentId,
    localDate: params.localDate,
    pleasant,
    mood: pleasantToStudentMoodKind(pleasant),
    note: params.note.trim(),
    ...(tags.length ? { reasonTags: tags } : {}),
    ...(otherDetail ? { otherDetail } : {}),
    createdAt: now,
    updatedAt: now,
  };
}
