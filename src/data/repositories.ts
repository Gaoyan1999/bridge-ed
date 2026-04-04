import type { DataSourceMode } from './config';
import type { LearningCardBackend } from './entity/learning-card-backend';
import type { StudentMoodBackend } from './entity/student-mood-backend';
import type { UserBackend } from './entity/user-backend';

export interface LearningCardsRepository {
  /** Cards where `authorUserId === userId` (teacher’s own). Empty `userId` yields `[]`. */
  listByUserId(userId: string): Promise<LearningCardBackend[]>;
  /** Sent cards visible to this parent: `whole_class`, or `selected_parents` when `selectedStudentIds` intersects the parent’s `children`. */
  listForParentUser(parentUserId: string): Promise<LearningCardBackend[]>;
  /** Sent cards visible to this student: `whole_class`, or `selected_parents` when `selectedStudentIds` includes them. */
  listForStudentUser(studentUserId: string): Promise<LearningCardBackend[]>;
  get(id: string): Promise<LearningCardBackend | undefined>;
  put(card: LearningCardBackend): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface StudentMoodsRepository {
  get(id: string): Promise<StudentMoodBackend | undefined>;
  put(entry: StudentMoodBackend): Promise<void>;
  /** Inclusive `YYYY-MM-DD` range (lexicographic order matches chronological for ISO dates). */
  listInLocalDateRange(startLocalDate: string, endLocalDate: string): Promise<StudentMoodBackend[]>;
  /** Parent dashboard: moods for students in `users.children` when `parentUserId` is set; otherwise all rows (no parent context). */
  getChildrenMood(parentUserId?: string): Promise<StudentMoodBackend[]>;
  delete(id: string): Promise<void>;
}

export interface UsersRepository {
  get(id: string): Promise<UserBackend | undefined>;
  list(): Promise<UserBackend[]>;
  put(user: UserBackend): Promise<void>;
}

/** App data — swap implementation via `VITE_DATA_SOURCE`. */
export interface DataLayer {
  readonly mode: DataSourceMode;
  readonly learningCards: LearningCardsRepository;
  readonly studentMoods: StudentMoodsRepository;
  readonly users: UsersRepository;
}
