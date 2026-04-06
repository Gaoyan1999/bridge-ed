import {
  TEACHER_TODO_LIST_SCHEMA_VERSION,
  type TeacherTodoItemBackend,
  type TeacherTodoListBackend,
} from './entity/teacher-todo-list-backend';

function normalizeItem(raw: unknown): TeacherTodoItemBackend {
  if (!raw || typeof raw !== 'object') {
    return { checked: false, content: '' };
  }
  const r = raw as Record<string, unknown>;
  const content = typeof r.content === 'string' ? r.content : '';
  const checked =
    typeof r.checked === 'boolean'
      ? r.checked
      : typeof r.done === 'boolean'
        ? r.done
        : false;
  return { checked, content };
}

export function normalizeTeacherTodoListBackend(raw: unknown): TeacherTodoListBackend {
  if (!raw || typeof raw !== 'object') {
    throw new Error('TeacherTodoListBackend: expected an object');
  }
  const r = raw as Partial<TeacherTodoListBackend> & { userId?: string };
  const userId = typeof r.userId === 'string' ? r.userId : '';
  if (!userId.trim()) throw new Error('TeacherTodoListBackend: missing userId');

  const now = new Date().toISOString();
  const listRaw = Array.isArray(r.list) ? r.list : [];
  const list = listRaw.map((row) => normalizeItem(row));

  return {
    schemaVersion: TEACHER_TODO_LIST_SCHEMA_VERSION,
    userId,
    list,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
  };
}
