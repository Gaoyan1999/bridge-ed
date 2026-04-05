import type { LearningCardChildKnowledge, LearningCardTonightAction } from '@/bridge/types';

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

export const LEARNING_CARD_SCHEMA_VERSION = 2 as const;

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

  status: LearningCardStatusBackend;
}


export type LearningCardStatusBackend = {
  status: 'draft' | 'sent' | 'archived';
  student: LearningCardStudentFeedback[];
  parent: LearningCardParentFeedback[];
};

type LearningCardStudentFeedback = {
  studentId: string;
  watchedVideo: boolean;  
  chatedWithAI: boolean;
  status: 'not_started' | 'learning' | 'finished';
  finishedType?: 'pretty_easy' | 'think_get_it' | 'challenge';
}


type LearningCardParentFeedback = {
  parentId: string;
  status: 'unread' | 'read' | 'actioned';
  chatedWithAI: boolean;
  doNotUnderstand: boolean;
}