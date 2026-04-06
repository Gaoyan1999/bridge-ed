import type { QuizBackend } from './entity/quiz-backend';

/** Accepts legacy rows before `learningCardId` existed. */
export type QuizBackendInput = Omit<QuizBackend, 'learningCardId'> & { learningCardId?: string };

export function normalizeQuizBackend(raw: QuizBackendInput): QuizBackend {
  return {
    id: String(raw.id).trim(),
    learningCardId: String(raw.learningCardId ?? '').trim(),
    parentId: String(raw.parentId).trim(),
    studentId: String(raw.studentId).trim(),
    createdAt: String(raw.createdAt),
    questions: (raw.questions ?? []).map((q) => ({
      question: String(q.question),
      options: (q.options ?? []).map(String),
      correctAnswer: String(q.correctAnswer),
      studentAnswer: q.studentAnswer != null && q.studentAnswer !== '' ? String(q.studentAnswer) : undefined,
    })),
    status: raw.status === 'completed' ? 'completed' : 'pending',
    ...(raw.sourceQuizText != null && String(raw.sourceQuizText).trim() !== ''
      ? { sourceQuizText: String(raw.sourceQuizText) }
      : {}),
    ...(raw.structuredPayloadJson != null && String(raw.structuredPayloadJson).trim() !== ''
      ? { structuredPayloadJson: String(raw.structuredPayloadJson) }
      : {}),
  };
}
