import type { DataSourceMode } from './config';
import type { LearningCard, NewLearningCard } from './types';

export interface LearningCardsRepository {
  list(): Promise<LearningCard[]>;
  get(id: string): Promise<LearningCard | undefined>;
  create(input: NewLearningCard): Promise<LearningCard>;
  update(card: LearningCard): Promise<void>;
  delete(id: string): Promise<void>;
}

/** App data — swap implementation via `VITE_DATA_SOURCE`. */
export interface DataLayer {
  readonly mode: DataSourceMode;
  readonly learningCards: LearningCardsRepository;
}
