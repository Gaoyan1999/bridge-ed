/**
 * One mood check-in for a student (local calendar day).
 * Stored in IndexedDB / future API as `studentMoods`.
 */

/** Matches parent week mock labels — emoji is derived at render time, not stored. */
export const STUDENT_MOOD_KINDS = ['okay', 'happy', 'neutral', 'tired', 'excited'] as const;
export type StudentMoodKind = (typeof STUDENT_MOOD_KINDS)[number];

export const STUDENT_MOOD_SCHEMA_VERSION = 2 as const;

export interface StudentMoodBackend {
  id: string;
  schemaVersion: typeof STUDENT_MOOD_SCHEMA_VERSION;

  /** Stable roster id — demo: `student-alex-wang`. */
  studentId: string;
  /** Shown on parent dashboard. */
  studentDisplayName: string;

  /** Local calendar date (browser timezone), `YYYY-MM-DD`. */
  localDate: string;

  /** Slider value 0–100 from student check-in (kept for analytics / editing). */
  pleasant: number;
  mood: StudentMoodKind;

  note: string;

  /** TODO(auth): authenticated student user id. */
  authorUserId: string;

  createdAt: string;
  updatedAt: string;
}
