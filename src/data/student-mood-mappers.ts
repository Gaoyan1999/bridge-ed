import { pleasantToStudentMoodKind } from '@/bridge/moodUtils';
import {
  STUDENT_MOOD_KINDS,
  STUDENT_MOOD_SCHEMA_VERSION,
  type StudentMoodBackend,
  type StudentMoodKind,
} from './entity/student-mood-backend';

export const HARDCODED_STUDENT_MOOD_AUTHOR_ID = 'demo-student';

/** Deterministic id per student + local day (upsert same day). */
export function studentMoodStableId(studentId: string, localDate: string): string {
  return `sm:${studentId}:${localDate}`;
}

function isStudentMoodKind(v: unknown): v is StudentMoodKind {
  return typeof v === 'string' && (STUDENT_MOOD_KINDS as readonly string[]).includes(v);
}

/** Normalize legacy rows (v1 had `label` string) and ensure `mood` is set. */
export function normalizeStudentMoodBackend(raw: Partial<StudentMoodBackend> & { label?: string }): StudentMoodBackend {
  const pleasant = Math.max(0, Math.min(100, Math.round(raw.pleasant ?? 50)));
  const mood: StudentMoodKind = isStudentMoodKind(raw.mood) ? raw.mood : pleasantToStudentMoodKind(pleasant);

  return {
    id: raw.id!,
    schemaVersion: STUDENT_MOOD_SCHEMA_VERSION,
    studentId: raw.studentId!,
    studentDisplayName: raw.studentDisplayName!,
    localDate: raw.localDate!,
    pleasant,
    mood,
    note: typeof raw.note === 'string' ? raw.note : '',
    authorUserId: raw.authorUserId!,
    createdAt: raw.createdAt!,
    updatedAt: raw.updatedAt!,
  };
}

export function buildStudentMoodFromCheckIn(params: {
  studentId: string;
  studentDisplayName: string;
  pleasant: number;
  note: string;
  localDate: string;
}): StudentMoodBackend {
  const now = new Date().toISOString();
  const id = studentMoodStableId(params.studentId, params.localDate);
  const pleasant = Math.max(0, Math.min(100, Math.round(params.pleasant)));
  return {
    id,
    schemaVersion: STUDENT_MOOD_SCHEMA_VERSION,
    studentId: params.studentId,
    studentDisplayName: params.studentDisplayName,
    localDate: params.localDate,
    pleasant,
    mood: pleasantToStudentMoodKind(pleasant),
    note: params.note.trim(),
    authorUserId: HARDCODED_STUDENT_MOOD_AUTHOR_ID,
    createdAt: now,
    updatedAt: now,
  };
}
