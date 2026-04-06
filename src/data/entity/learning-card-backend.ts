import type {
  LearningCardChildKnowledge,
  LearningCardTonightAction,
  LearningCardTonightActionPreset,
} from '@/bridge/types';

/**
 * Backend contract for Learning Cards intended for REST/JSON APIs and IndexedDB documents.
 *
 * Conventions:
 * - **Timestamps**: ISO 8601 strings in **UTC** (e.g. `2026-04-04T18:30:00.000Z`). IndexedDB stores the same strings.
 * - **IDs**: opaque strings (UUID recommended); never rely on display names as keys.
 * - **schemaVersion**: bump when you migrate stored shapes (IndexedDB upgrade, API versioning).
 *
 * IndexedDB hints (suggested):
 * - Object store: `learningCards`, keyPath: `id`
 * - Indexes: `authorUserId`, `classId`, `sentAt`, `updatedAt`
 */

export const LEARNING_CARD_SCHEMA_VERSION = 4 as const;

/** Who receives the card (maps from wizard `class` / `selected`). */
export type LearningCardAudienceMode = 'whole_class' | 'selected_parents';

/** Same shape as `LearningCardTonightAction` in persisted JSON / IndexedDB. */
export type LearningCardTonightActionBackend = LearningCardTonightAction;

/**
 * Canonical persisted record for one learning card (create -> send -> optional updates).
 * **What you `put()` in IndexedDB should match this shape exactly (plus future optional fields).**
 */
export interface LearningCardBackend {
  id: string;
  schemaVersion: typeof LEARNING_CARD_SCHEMA_VERSION;

  createdAt: string;
  updatedAt: string;

  /** Owner teacher user id (`UserBackend.id` with `role === 'teacher'`). */
  authorUserId: string;

  /** Roster / class entity; `null` when only free-text lesson title exists. */
  classId: string | null;

  /** Wizard: Class / lesson title */
  classLessonTitle: string;
  grade: string;
  subject: string;
  /** Primary title line for listings (wizard "Topic & focus"). */
  topic: string;
  /** Optional notes passed to the generator. */
  teacherNotes: string;

  /** AI / teacher-edited parent-facing summary. */
  parentSummary: string;
  translatedSummaries?: {
    zh?: string;
    en?: string;
    fr?: string;
  };
  /** Student Knowledge: optional discovery payload (hero image + free-form text). */
  childKnowledge?: LearningCardChildKnowledge;
  tonightActions: LearningCardTonightActionBackend[];

  audience: {
    mode: LearningCardAudienceMode;
    recipientCount: number;
    selectedStudentIds: string[];
  };

  /** When the card was successfully sent to families (null while not yet sent). */
  sentAt: string | null;

  /** Chat / notification thread for this card. */
  threadId: string;

  /** Per-student Knowledge progress (legacy rows nested under `status.student` before v4). */
  studentFeedbacks?: LearningCardStudentFeedback[];

  parentFeedbacks?: LearningCardParentFeedback[];
}

export type LearningCardParentFeedback = {
  parentId: string;
  /** Parent tapped “still don’t understand” on this card. */
  doNotUnderstand: boolean;
  /** Teacher-included tonight presets the parent marked done (strikethrough) in Knowledge. */
  tonightActionsDone?: LearningCardTonightActionPreset[];
};

/** Student Knowledge progress — distinct from parent read/action workflow. */
export type LearningCardStudentLearningStatus = 'not_started' | 'learning' | 'finished';

export type LearningCardStudentFinishedType = 'pretty_easy' | 'think_get_it' | 'challenge';

/**
 * Per-student progress on a card (Knowledge).
 * Persisted under `studentFeedbacks[]` (legacy: `status.student[]`).
 */
export type LearningCardStudentFeedback = {
  studentId: string;
  watchedVideo: boolean;
  chatedWithAI: boolean;
  status: LearningCardStudentLearningStatus;
  /** Set when `status === 'finished'` (how it felt / self-report). */
  finishedType?: LearningCardStudentFinishedType;
  feeling?: string;
  /**
   * Quiz uptake: **student** sets this when they run the Quiz flow from the composer; **parent** sets it on
   * linked children when they mark the Quiz todo done in Tonight's actions.
   */
  actionQuiz?: boolean;
  /**
   * Hands-on uptake: **student** from composer; **parent** when they mark the hands-on todo done (synced to children).
   */
  actionPractice?: boolean;
  /**
   * Teach-back uptake: **student** from composer; **parent** when they mark the teach-back todo done (synced to children).
   */
  actionTeachBack?: boolean;
};

export function getDefaultLearningCardStudentFeedback(studentId: string): LearningCardStudentFeedback {
  return {
    studentId,
    watchedVideo: false,
    chatedWithAI: false,
    status: 'not_started',
  };
}
