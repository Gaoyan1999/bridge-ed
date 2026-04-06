/**
 * Teacher dashboard “Today” checklist — one document per user (`teacherTodoLists` in IndexedDB).
 */

export const TEACHER_TODO_LIST_SCHEMA_VERSION = 1 as const;

export type TeacherTodoItemBackend = {
  checked: boolean;
  content: string;
};

export interface TeacherTodoListBackend {
  schemaVersion: typeof TEACHER_TODO_LIST_SCHEMA_VERSION;
  userId: string;
  list: TeacherTodoItemBackend[];
  updatedAt: string;
}
