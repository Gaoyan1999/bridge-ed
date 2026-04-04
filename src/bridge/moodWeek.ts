/** Local calendar helpers for Mon–Sun parent mood week (browser timezone). */

export function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export type WeekDayCell = {
  /** `YYYY-MM-DD` */
  dateStr: string;
  shortLabel: (typeof WEEKDAY_SHORT)[number];
};

/** Current ISO week: Monday → Sunday, local time. */
export function getCurrentWeekDays(anchor: Date = new Date()): WeekDayCell[] {
  const monday = startOfWeekMonday(anchor);
  return WEEKDAY_SHORT.map((shortLabel, i) => ({
    dateStr: formatLocalYmd(addDays(monday, i)),
    shortLabel,
  }));
}

export function getCurrentWeekLocalDateRange(anchor: Date = new Date()): { start: string; end: string } {
  const days = getCurrentWeekDays(anchor);
  return { start: days[0]!.dateStr, end: days[6]!.dateStr };
}
