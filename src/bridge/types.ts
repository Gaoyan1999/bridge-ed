export type Role = 'parent' | 'student' | 'teacher';

export type Module = 'dashboard' | 'chat' | 'knowledge' | 'mood';

export type InboxKind = 'broadcast' | 'dm' | 'booking' | 'draft' | 'report' | 'card';

export interface InboxItem {
  id: string;
  title: string;
  date: string;
  kind: InboxKind;
}

/** User-uploaded image in chat/Knowledge threads (demo: data URLs in memory). */
export type ThreadMessageAttachment = {
  kind: 'image';
  url: string;
  name?: string;
};

export interface ThreadMessage {
  who: string;
  type: 'in' | 'out';
  text: string;
  attachments?: ThreadMessageAttachment[];
}

/** Parent dashboard children linked to mood check-ins (demo roster). */
export type ParentMoodChildProfile = {
  studentId: string;
  displayName: string;
};

/** Fixed "tonight" options (not AI-generated); order is stable in storage. */
export const LEARNING_CARD_TONIGHT_ACTION_PRESETS = ['quiz', 'parent_led_practice', 'explain_to_parent'] as const;
export type LearningCardTonightActionPreset = (typeof LEARNING_CARD_TONIGHT_ACTION_PRESETS)[number];

/** One row per preset; `text` is optional teacher notes (stored, not shown in UI yet). */
export type LearningCardTonightAction = {
  preset: LearningCardTonightActionPreset;
  include: boolean;
  text: string;
};

export interface LearningCardItem {
  id: string;
  title: string;
  /** Grade label (e.g. G7). Empty for parent-only demo fixtures. */
  grade: string;
  /** Subject line for listings (e.g. Math, or Math · Geometry). */
  subject: string;
  status: string;
  summary: string;
  /** Unix ms sort order and "Linked to ..." line in `LearningCardTile`. */
  at: number;
  threadId: string;
  /** Teacher-selected tonight tasks (3 fixed presets), from persisted card. */
  tonightActions: LearningCardTonightAction[];
}

/** Short chip labels for Knowledge / compact UI. */
export const LEARNING_CARD_TONIGHT_PRESET_SHORT: Record<LearningCardTonightActionPreset, string> = {
  quiz: 'Quiz',
  parent_led_practice: 'Practice',
  explain_to_parent: 'Teach-back',
};

/** Fixed copy for each preset (wizard + any list UI). */
export const LEARNING_CARD_TONIGHT_PRESET_LABELS: Record<
  LearningCardTonightActionPreset,
  { title: string; description: string }
> = {
  quiz: {
    title: 'Do a short quiz or practice check',
    description: 'A few quick questions to see if the idea has clicked.',
  },
  parent_led_practice: {
    title: 'Design a hands-on mini task or experiment',
    description: 'Parent and child try a small activity or real-world application together.',
  },
  explain_to_parent: {
    title: 'Teach-back - child explains to parent',
    description: "The child walks you through the topic so you can tell they've understood.",
  },
};

/**
 * Full payload when the teacher confirms "Send learning card" (wizard demo / future API body).
 */
export type LearningCardCreatePayload = {
  sentAt: number;
  classInput: {
    classLesson: string;
    grade: string;
    subject: string;
    topic: string;
    notes: string;
  };
  generated: {
    parentSummary: string;
    tonightActions: LearningCardTonightAction[];
  };
  audience: {
    mode: 'class' | 'selected';
    recipientCount: number;
    /** When mode === 'selected', which roster students' parents are included. */
    selectedParentsByStudent?: Record<string, boolean>;
  };
};

export interface ScheduleDay {
  day: string;
  items: string[];
}

export type ModalState =
  | { type: 'none' }
  | { type: 'generic'; title: string; body: string }
  | { type: 'book' }
  | { type: 'broadcast' }
  | { type: 'report' }
  | { type: 'learningCard' }
  /** Teacher dashboard placeholder before opening parent Knowledge preview (content TBD). */
  | { type: 'teacherCardPreviewTodo'; card: LearningCardItem };
