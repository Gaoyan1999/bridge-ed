export function moodSpectrumLabel(v: number): string {
  const n = Number(v);
  if (n <= 15) return 'Very unpleasant';
  if (n <= 35) return 'Unpleasant';
  if (n <= 65) return 'Neutral';
  if (n <= 85) return 'Pleasant';
  return 'Very pleasant';
}
