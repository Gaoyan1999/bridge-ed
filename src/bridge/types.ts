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
  /** Unix ms — used for sort order and display via `formatLearningCardLinkedDay`. */
  at: number;
  threadId: string;
}

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
