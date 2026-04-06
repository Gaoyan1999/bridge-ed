import type { DataSourceMode } from './config';
import type { BroadcastBackend } from './entity/broadcast-backend';
import type { LearningCardBackend } from './entity/learning-card-backend';
import type { ReportBackend } from './entity/report-backend';
import type { StudentMoodBackend } from './entity/student-mood-backend';
import type { TeacherTodoListBackend } from './entity/teacher-todo-list-backend';
import type { ParentBookingBackend } from './entity/parent-booking-backend';
import type { QuizBackend } from './entity/quiz-backend';
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

export interface ReportsRepository {
  /** Reports authored by this teacher. */
  listByAuthorUserId(authorUserId: string): Promise<ReportBackend[]>;
  /** All persisted reports (e.g. hydrate Messages after reload), newest `sentAt` first. */
  listAll(): Promise<ReportBackend[]>;
  get(id: string): Promise<ReportBackend | undefined>;
  put(report: ReportBackend): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface BroadcastsRepository {
  listByAuthorUserId(authorUserId: string): Promise<BroadcastBackend[]>;
  listAll(): Promise<BroadcastBackend[]>;
  get(id: string): Promise<BroadcastBackend | undefined>;
  put(broadcast: BroadcastBackend): Promise<void>;
  delete(id: string): Promise<void>;
}

/** One `{ userId, list }` document per teacher (see `teacher-todo-list-backend.ts`). */
export interface TeacherTodoListsRepository {
  get(userId: string): Promise<TeacherTodoListBackend | undefined>;
  put(doc: TeacherTodoListBackend): Promise<void>;
}

export interface ParentBookingsRepository {
  listAll(): Promise<ParentBookingBackend[]>;
  get(id: string): Promise<ParentBookingBackend | undefined>;
  put(booking: ParentBookingBackend): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface QuizzesRepository {
  /** All worksheets / structured quizzes saved for this parent (newest first). */
  listForParent(parentId: string): Promise<QuizBackend[]>;
  /** Worksheets assigned to this student (`studentId` on the row). */
  listForStudent(studentId: string): Promise<QuizBackend[]>;
  /** Worksheets for this student on one learning card. */
  listForStudentAndLearningCard(studentId: string, learningCardId: string): Promise<QuizBackend[]>;
  /** Worksheets for one learning card (same `learningCardId` as `LearningCardBackend.id`). */
  listForParentAndLearningCard(parentId: string, learningCardId: string): Promise<QuizBackend[]>;
  get(id: string): Promise<QuizBackend | undefined>;
  put(quiz: QuizBackend): Promise<void>;
  delete(id: string): Promise<void>;
}

/** App data — swap implementation via `VITE_DATA_SOURCE`. */
export interface DataLayer {
  readonly mode: DataSourceMode;
  readonly learningCards: LearningCardsRepository;
  readonly studentMoods: StudentMoodsRepository;
  readonly users: UsersRepository;
  readonly reports: ReportsRepository;
  readonly broadcasts: BroadcastsRepository;
  readonly teacherTodoLists: TeacherTodoListsRepository;
  readonly parentBookings: ParentBookingsRepository;
  readonly quizzes: QuizzesRepository;
}
