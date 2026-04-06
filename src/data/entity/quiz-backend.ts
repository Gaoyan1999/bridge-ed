export type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  studentAnswer?: string;
};

export type QuizBackend = {
  id: string;
  /** `LearningCardBackend.id` — which learning card this worksheet was generated from. */
  learningCardId: string;
  parentId: string;
  studentId: string;
  createdAt: string;
  questions: QuizQuestion[];
  status: 'pending' | 'completed';
  /** Raw Knowledge quiz thread text sent to `knowledgeGenerateStructuredQuiz`. */
  sourceQuizText?: string;
  /** Full JSON of `StructuredQuizResult` from the LLM (verbatim structured payload). */
  structuredPayloadJson?: string;
};
