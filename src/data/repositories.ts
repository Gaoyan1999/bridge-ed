import type { DataSourceMode } from './config';
import type { LearningCardBackend } from './entity/learning-card-backend';

export interface LearningCardsRepository {
  /** Future: filter by author; currently returns all records (demo hack). */
  listByUserId(userId: string): Promise<LearningCardBackend[]>;
  get(id: string): Promise<LearningCardBackend | undefined>;
  put(card: LearningCardBackend): Promise<void>;
  delete(id: string): Promise<void>;
}

/** App data — swap implementation via `VITE_DATA_SOURCE`. */
export interface DataLayer {
  readonly mode: DataSourceMode;
  readonly learningCards: LearningCardsRepository;
}
