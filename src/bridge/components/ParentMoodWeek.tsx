import type { ParentMoodChildProfile } from '@/bridge/types';
import type { StudentMoodBackend } from '@/data/entity/student-mood-backend';
import { studentMoodKindEmoji, studentMoodKindLabel } from '@/bridge/moodUtils';
import { formatLocalYmd, getCurrentWeekDays } from '@/bridge/moodWeek';
import { cx } from '@/bridge/cx';

type Props = {
  childrenProfiles: ParentMoodChildProfile[];
  entries: StudentMoodBackend[];
};

function buildLookup(entries: StudentMoodBackend[]): Map<string, StudentMoodBackend> {
  const m = new Map<string, StudentMoodBackend>();
  for (const e of entries) {
    m.set(`${e.studentId}|${e.localDate}`, e);
  }
  return m;
}

export function ParentMoodWeek({ childrenProfiles, entries }: Props) {
  const week = getCurrentWeekDays();
  const today = formatLocalYmd(new Date());
  const lookup = buildLookup(entries);

  return (
    <div className="parent-mood-week" id="parent-mood-week">
      {childrenProfiles.map((child) => (
        <section key={child.studentId} className="parent-mood-child-block" aria-label={`Mood week for ${child.displayName}`}>
          <h4 className="parent-mood-child__name">{child.displayName}</h4>
          <div className="parent-mood-week-grid-wrap">
            <div className="parent-mood-grid parent-mood-grid--week" role="list">
              {week.map((day) => {
                const key = `${child.studentId}|${day.dateStr}`;
                const row = lookup.get(key);
                const isFuture = day.dateStr > today;
                const isToday = day.dateStr === today;

                if (isFuture) {
                  return (
                    <div
                      key={day.dateStr}
                      className="parent-mood-day parent-mood-day--placeholder"
                      role="listitem"
                    >
                      <span className="parent-mood-day__date">{day.shortLabel}</span>
                      <span className="parent-mood-day__emoji" aria-hidden="true">
                        —
                      </span>
                      <span className="parent-mood-day__label parent-mood-day__label--muted">—</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={day.dateStr}
                    className={cx('parent-mood-day', isToday && 'parent-mood-day--today', !row && 'parent-mood-day--empty')}
                    role="listitem"
                  >
                    <span className="parent-mood-day__date">{day.shortLabel}</span>
                    <span className="parent-mood-day__emoji" aria-hidden="true">
                      {row ? studentMoodKindEmoji(row.mood) : '—'}
                    </span>
                    <span className="parent-mood-day__label">{row ? studentMoodKindLabel(row.mood) : '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
