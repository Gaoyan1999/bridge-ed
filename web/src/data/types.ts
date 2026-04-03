export type LearningCardId = string;

export type LearningCard = {
  id: LearningCardId;
  title: string;
  teacherSummary: string;
  parentActions: string[];
  createdAt: string;
  updatedAt: string;
};

export type NewLearningCard = Omit<LearningCard, 'id' | 'createdAt' | 'updatedAt'>;
