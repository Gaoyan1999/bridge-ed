/**
 * Formats a card timestamp for the parent dashboard “Linked to …” line (e.g. Mon 4/1).
 */
export function formatLearningCardLinkedDay(at: number): string {
  const d = new Date(at);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
  return `${weekdays[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}
