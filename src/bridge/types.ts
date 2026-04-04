export type Role = 'parent' | 'student' | 'teacher';

export type Module = 'dashboard' | 'ai' | 'chat' | 'mood';

export type InboxKind = 'broadcast' | 'dm' | 'booking' | 'draft' | 'report' | 'card';

export interface InboxItem {
  id: string;
  title: string;
  date: string;
  kind: InboxKind;
}

export interface ThreadMessage {
  who: string;
  type: 'in' | 'out';
  text: string;
}

export interface LearningCardItem {
  id: string;
  title: string;
  subject: string;
  status: string;
  summary: string;
  /** Unix ms — sort order and “Linked to …” line in `LearningCardTile`. */
  at: number;
  threadId: string;
}

/** One “tonight’s action” row after generate / edit in the wizard. */
export type LearningCardTonightAction = {
  text: string;
  include: boolean;
};

/**
 * Full payload when the teacher confirms “Send learning card” (wizard — demo / future API body).
 */
export type LearningCardCreatePayload = {
  sentAt: number;
  classInput: {
    classLesson: string;
    grade: string;
    subject: string;
    topic: string;
    notes: string;
    /** Derived: `grade · subject` style line passed to the generator. */
    gradeSubjectLine: string;
  };
  generated: {
    parentSummary: string;
    tonightActions: LearningCardTonightAction[];
  };
  audience: {
    mode: 'class' | 'selected';
    recipientCount: number;
    /** When `mode === 'selected'`, which roster students’ parents are included. */
    selectedParentsByStudent?: Record<string, boolean>;
  };
};

export interface ScheduleDay {
  day: string;
  items: string[];
}

export interface MoodDay {
  day: string;
  emoji: string;
  label: string;
}

export type ModalState =
  | { type: 'none' }
  | { type: 'generic'; title: string; body: string }
  | { type: 'book' }
  | { type: 'broadcast' }
  | { type: 'report' }
  | { type: 'learningCard' };
