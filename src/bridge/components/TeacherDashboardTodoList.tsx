import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { seedTeacherTodoListIfEmpty } from '@/bridge/teacher-dashboard-todo-seed';
import { Button } from '@/bridge/components/ui/Button';
import { cx } from '@/bridge/cx';
import { getDataLayer } from '@/data';
import {
  TEACHER_TODO_LIST_SCHEMA_VERSION,
  type TeacherTodoListBackend,
} from '@/data/entity/teacher-todo-list-backend';

type UiRow = { key: string; checked: boolean; content: string };

function toUiList(list: { checked: boolean; content: string }[]): UiRow[] {
  return list.map((item) => ({
    key: crypto.randomUUID(),
    checked: item.checked,
    content: item.content,
  }));
}

function toBackendList(rows: UiRow[]): { checked: boolean; content: string }[] {
  return rows.map(({ checked, content }) => ({ checked, content }));
}

type Props = {
  authorUserId: string;
};

export function TeacherDashboardTodoList({ authorUserId }: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<UiRow[]>([]);
  const [loadError, setLoadError] = useState(false);

  const persistDoc = useCallback(
    async (list: UiRow[]) => {
      const id = authorUserId.trim();
      if (!id) return;
      const doc: TeacherTodoListBackend = {
        schemaVersion: TEACHER_TODO_LIST_SCHEMA_VERSION,
        userId: id,
        list: toBackendList(list),
        updatedAt: new Date().toISOString(),
      };
      await getDataLayer().teacherTodoLists.put(doc);
    },
    [authorUserId],
  );

  const reload = useCallback(async () => {
    const id = authorUserId.trim();
    if (!id) {
      setRows([]);
      return;
    }
    try {
      await seedTeacherTodoListIfEmpty(id);
      const doc = await getDataLayer().teacherTodoLists.get(id);
      setRows(doc?.list?.length ? toUiList(doc.list) : []);
      setLoadError(false);
    } catch {
      setLoadError(true);
      setRows([]);
    }
  }, [authorUserId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggleDone = useCallback(
    (key: string) => {
      setRows((prev) => {
        const next = prev.map((r) => (r.key === key ? { ...r, checked: !r.checked } : r));
        void persistDoc(next);
        return next;
      });
    },
    [persistDoc],
  );

  const commitText = useCallback(
    (key: string, text: string) => {
      const trimmed = text.trim();
      setRows((prev) => {
        const row = prev.find((r) => r.key === key);
        if (!row) return prev;
        if (!trimmed) {
          const next = prev.filter((r) => r.key !== key);
          void persistDoc(next);
          return next;
        }
        const next = prev.map((r) => (r.key === key ? { ...r, content: trimmed } : r));
        void persistDoc(next);
        return next;
      });
    },
    [persistDoc],
  );

  const addTodo = useCallback(() => {
    setRows((prev) => {
      const next = [...prev, { key: crypto.randomUUID(), checked: false, content: '' }];
      void persistDoc(next);
      return next;
    });
  }, [persistDoc]);

  const removeTodo = useCallback(
    (key: string) => {
      setRows((prev) => {
        const next = prev.filter((r) => r.key !== key);
        void persistDoc(next);
        return next;
      });
    },
    [persistDoc],
  );

  if (loadError) {
    return <p className="panel__hint">{t('dashboard.teacher.todoLoadError')}</p>;
  }

  return (
    <div className="teacher-dashboard-todo">
      <ul className="todo-list" id="dash-todo-list">
        {rows.map((todo) => (
          <li key={todo.key}>
            <input
              type="checkbox"
              id={`todo-${todo.key}`}
              checked={todo.checked}
              onChange={() => toggleDone(todo.key)}
              aria-checked={todo.checked}
            />
            <input
              type="text"
              className={cx('todo-list__text', todo.checked && 'todo-list__text--done')}
              id={`todo-text-${todo.key}`}
              name={`todo-text-${todo.key}`}
              value={todo.content}
              placeholder={t('dashboard.teacher.todoNewPlaceholder')}
              aria-label={t('dashboard.teacher.todoTaskLabel')}
              onChange={(e) => {
                const v = e.target.value;
                setRows((prev) => prev.map((x) => (x.key === todo.key ? { ...x, content: v } : x)));
              }}
              onBlur={(e) => commitText(todo.key, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
            <button
              type="button"
              className="todo-list__remove"
              aria-label={t('dashboard.teacher.todoRemoveAria')}
              onClick={() => removeTodo(todo.key)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="teacher-dashboard-todo__footer">
        <Button variant="text" type="button" className="btn--sm" id="btn-todo-add" onClick={addTodo}>
          {t('dashboard.teacher.todoAdd')}
        </Button>
      </div>
    </div>
  );
}
