import { DASH_TODOS } from '@/bridge/mockData';
import { getDataLayer } from '@/data';
import {
  TEACHER_TODO_LIST_SCHEMA_VERSION,
  type TeacherTodoListBackend,
} from '@/data/entity/teacher-todo-list-backend';

/** First-time seed: mirrors legacy `DASH_TODOS` demo copy. */
export async function seedTeacherTodoListIfEmpty(userId: string): Promise<void> {
  const id = userId.trim();
  if (!id) return;
  const dl = getDataLayer();
  const existing = await dl.teacherTodoLists.get(id);
  if (existing !== undefined) return;
  const now = new Date().toISOString();
  const doc: TeacherTodoListBackend = {
    schemaVersion: TEACHER_TODO_LIST_SCHEMA_VERSION,
    userId: id,
    list: DASH_TODOS.map((row) => ({ checked: row.done, content: row.text })),
    updatedAt: now,
  };
  await dl.teacherTodoLists.put(doc);
}
