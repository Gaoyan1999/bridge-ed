/**
 * One mood check-in for a student (local calendar day).
 * Stored in IndexedDB / future API as `studentMoods`.
 * Display name comes from `UserBackend` via `studentId`, not duplicated here.
 */

/** Matches parent week mock labels — emoji is derived at render time, not stored. */
export const STUDENT_MOOD_KINDS = ['okay', 'happy', 'neutral', 'tired', 'excited'] as const;
export type StudentMoodKind = (typeof STUDENT_MOOD_KINDS)[number];

export const STUDENT_MOOD_SCHEMA_VERSION = 4 as const;

export interface StudentMoodBackend {
  id: string;
  schemaVersion: typeof STUDENT_MOOD_SCHEMA_VERSION;

  /** User id of the student (see `UserBackend` with `role === 'student'`). */
  studentId: string;

  /** Local calendar date (browser timezone), `YYYY-MM-DD`. */
  localDate: string;

  /** Slider value 0–100 from student check-in (kept for analytics / editing). */
  pleasant: number;
  mood: StudentMoodKind;

  note: string;

  /** Optional check-in tags (stable ids, e.g. `exam_results`). */
  reasonTags?: string[];
  /** Free text when `other` is among `reasonTags`. */
  otherDetail?: string;

  createdAt: string;
  updatedAt: string;
}
