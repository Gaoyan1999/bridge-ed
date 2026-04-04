import type { DataSourceMode } from './config';
import type { LearningCardBackend } from './entity/learning-card-backend';
import type { StudentMoodBackend } from './entity/student-mood-backend';

export interface LearningCardsRepository {
  /** Future: filter by author; currently returns all records (demo hack). */
  listByUserId(userId: string): Promise<LearningCardBackend[]>;
  get(id: string): Promise<LearningCardBackend | undefined>;
  put(card: LearningCardBackend): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface StudentMoodsRepository {
  get(id: string): Promise<StudentMoodBackend | undefined>;
  put(entry: StudentMoodBackend): Promise<void>;
  /** Inclusive `YYYY-MM-DD` range (lexicographic order matches chronological for ISO dates). */
  listInLocalDateRange(startLocalDate: string, endLocalDate: string): Promise<StudentMoodBackend[]>;
  /**
   * Parent dashboard: moods for all linked children.
   * TODO(auth): pass `parentUserId` and filter; demo returns every row.
   */
  getChildrenMood(parentUserId?: string): Promise<StudentMoodBackend[]>;
  delete(id: string): Promise<void>;
}

/** App data — swap implementation via `VITE_DATA_SOURCE`. */
export interface DataLayer {
  readonly mode: DataSourceMode;
  readonly learningCards: LearningCardsRepository;
  readonly studentMoods: StudentMoodsRepository;
}
