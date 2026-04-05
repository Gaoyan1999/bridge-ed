import type { StudentMoodKind } from '@/data/entity/student-mood-backend';

/** Five emoji steps → persisted pleasantness (0–100), aligned with `pleasantToStudentMoodKind` buckets. */
export const MOOD_LEVEL_PLEASANT = [10, 30, 50, 70, 90] as const;

export function moodLevelFromPleasant(pleasant: number): number {
  const p = Math.max(0, Math.min(100, Math.round(pleasant)));
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < MOOD_LEVEL_PLEASANT.length; i++) {
    const d = Math.abs(MOOD_LEVEL_PLEASANT[i] - p);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

export function moodSpectrumLabel(v: number): string {
  const n = Number(v);
  if (n <= 15) return 'Very unpleasant';
  if (n <= 35) return 'Unpleasant';
  if (n <= 65) return 'Neutral';
  if (n <= 85) return 'Pleasant';
  return 'Very pleasant';
}

/** Map slider 0–100 → persisted `StudentMoodKind` (five buckets). */
export function pleasantToStudentMoodKind(pleasant: number): StudentMoodKind {
  const n = Number(pleasant);
  if (n <= 20) return 'tired';
  if (n <= 40) return 'neutral';
  if (n <= 60) return 'okay';
  if (n <= 80) return 'happy';
  return 'excited';
}

const MOOD_KIND_EMOJI: Record<StudentMoodKind, string> = {
  okay: '🙂',
  happy: '😄',
  neutral: '😐',
  tired: '😕',
  excited: '😄',
};

const MOOD_KIND_LABEL: Record<StudentMoodKind, string> = {
  okay: 'Okay',
  happy: 'Happy',
  neutral: 'Neutral',
  tired: 'Tired',
  excited: 'Excited',
};

export function studentMoodKindEmoji(kind: StudentMoodKind): string {
  return MOOD_KIND_EMOJI[kind];
}

export function studentMoodKindLabel(kind: StudentMoodKind): string {
  return MOOD_KIND_LABEL[kind];
}
