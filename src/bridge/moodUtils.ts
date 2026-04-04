import type { StudentMoodKind } from '@/data/entity/student-mood-backend';

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
