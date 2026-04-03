import type { ScheduleDay } from '@/bridge/types';

export function ScheduleWeek({ days }: { days: ScheduleDay[] }) {
  return (
    <>
      {days.map((d) => (
        <div key={d.day} className="schedule-day">
          <div className="schedule-day__name">{d.day}</div>
          <ul>
            {d.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
