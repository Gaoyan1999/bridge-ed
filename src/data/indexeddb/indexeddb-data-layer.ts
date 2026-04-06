import { bridgeDb } from './bridge-db';
import type {
  BroadcastsRepository,
  DataLayer,
  LearningCardsRepository,
  ParentBookingsRepository,
  QuizzesRepository,
  ReportsRepository,
  StudentMoodsRepository,
  TeacherTodoListsRepository,
  UsersRepository,
} from '../repositories';
import type { BroadcastBackend } from '../entity/broadcast-backend';
import type { LearningCardBackend } from '../entity/learning-card-backend';
import type { ReportBackend } from '../entity/report-backend';
import { normalizeBroadcastBackend } from '../broadcast-mappers';
import { normalizeLearningCardBackend } from '../learning-card-mappers';
import { normalizeReportBackend } from '../report-mappers';
import type { StudentMoodBackend } from '../entity/student-mood-backend';
import type { TeacherTodoListBackend } from '../entity/teacher-todo-list-backend';
import type { ParentBookingBackend } from '../entity/parent-booking-backend';
import type { QuizBackend } from '../entity/quiz-backend';
import type { UserBackend } from '../entity/user-backend';
import { normalizeParentBookingBackend } from '../parent-booking-mappers';
import { normalizeQuizBackend } from '../quiz-mappers';
import { normalizeTeacherTodoListBackend } from '../teacher-todo-list-mappers';
import { normalizeStudentMoodBackend } from '../student-mood-mappers';

function sortBySentAtDesc<T extends { sentAt: string }>(a: T, b: T): number {
  const ta = Date.parse(a.sentAt);
  const tb = Date.parse(b.sentAt);
  const na = Number.isFinite(ta) ? ta : 0;
  const nb = Number.isFinite(tb) ? tb : 0;
  return nb - na;
}

function sortByCreatedAtDesc(a: LearningCardBackend, b: LearningCardBackend): number {
  const ta = Date.parse(a.createdAt);
  const tb = Date.parse(b.createdAt);
  const na = Number.isFinite(ta) ? ta : 0;
  const nb = Number.isFinite(tb) ? tb : 0;
  return nb - na;
}

class IndexedDbLearningCardsRepo implements LearningCardsRepository {
  async listByUserId(userId: string): Promise<LearningCardBackend[]> {
    const id = userId.trim();
    if (!id) return [];
    const rows = await bridgeDb.learningCards.toArray();
    return rows
      .filter((r) => {
        if (r.authorUserId === id) return true;
        // Legacy wizard rows used `"1"` before default author became `teacher-1`.
        if (id === 'teacher-1' && r.authorUserId === '1') return true;
        return false;
      })
      .map((r) => normalizeLearningCardBackend(r))
      .sort(sortByCreatedAtDesc);
  }

  async listForParentUser(parentUserId: string): Promise<LearningCardBackend[]> {
    const pid = parentUserId.trim();
    if (!pid) return [];
    const parent = await bridgeDb.users.get(pid);
    if (!parent || parent.role !== 'parent' || !parent.children?.length) return [];

    const childSet = new Set(parent.children);
    const rows = await bridgeDb.learningCards.toArray();
    const filtered = rows.filter((card) => {
      if (card.sentAt == null || String(card.sentAt).trim() === '') return false;
      if (card.audience.mode === 'whole_class') return true;
      return card.audience.selectedStudentIds.some((sid) => childSet.has(sid));
    });
    return filtered.map((r) => normalizeLearningCardBackend(r)).sort(sortByCreatedAtDesc);
  }

  async listForStudentUser(studentUserId: string): Promise<LearningCardBackend[]> {
    const sid = studentUserId.trim();
    if (!sid) return [];
    const user = await bridgeDb.users.get(sid);
    if (!user || user.role !== 'student') return [];

    const rows = await bridgeDb.learningCards.toArray();
    const filtered = rows.filter((card) => {
      if (card.sentAt == null || String(card.sentAt).trim() === '') return false;
      if (card.audience.mode === 'whole_class') return true;
      return card.audience.selectedStudentIds.some((id) => id === sid);
    });
    return filtered.map((r) => normalizeLearningCardBackend(r)).sort(sortByCreatedAtDesc);
  }

  async get(id: string): Promise<LearningCardBackend | undefined> {
    const raw = await bridgeDb.learningCards.get(id);
    return raw ? normalizeLearningCardBackend(raw) : undefined;
  }

  async put(card: LearningCardBackend): Promise<void> {
    await bridgeDb.learningCards.put(card);
  }

  async delete(id: string): Promise<void> {
    await bridgeDb.learningCards.delete(id);
  }
}

class IndexedDbStudentMoodsRepo implements StudentMoodsRepository {
  async get(id: string): Promise<StudentMoodBackend | undefined> {
    const raw = await bridgeDb.studentMoods.get(id);
    if (!raw) return undefined;
    return normalizeStudentMoodBackend(raw);
  }

  async put(entry: StudentMoodBackend): Promise<void> {
    await bridgeDb.studentMoods.put(entry);
  }

  async listInLocalDateRange(startLocalDate: string, endLocalDate: string): Promise<StudentMoodBackend[]> {
    const rows = await bridgeDb.studentMoods.toArray();
    return rows
      .filter((r) => r.localDate >= startLocalDate && r.localDate <= endLocalDate)
      .map((r) => normalizeStudentMoodBackend(r));
  }

  async getChildrenMood(parentUserId?: string): Promise<StudentMoodBackend[]> {
    let allowed: Set<string> | null = null;
    if (parentUserId) {
      const parent = await bridgeDb.users.get(parentUserId);
      if (parent?.role === 'parent' && parent.children?.length) {
        allowed = new Set(parent.children);
      }
    }
    const rows = await bridgeDb.studentMoods.toArray();
    let normalized = rows.map((r) => normalizeStudentMoodBackend(r));
    if (allowed) {
      normalized = normalized.filter((r) => allowed!.has(r.studentId));
    }
    return normalized.sort((a, b) => {
      const c = a.localDate.localeCompare(b.localDate);
      if (c !== 0) return c;
      return a.studentId.localeCompare(b.studentId);
    });
  }

  async delete(id: string): Promise<void> {
    await bridgeDb.studentMoods.delete(id);
  }
}

class IndexedDbUsersRepo implements UsersRepository {
  async get(id: string): Promise<UserBackend | undefined> {
    return bridgeDb.users.get(id);
  }

  async list(): Promise<UserBackend[]> {
    return bridgeDb.users.toArray();
  }

  async put(user: UserBackend): Promise<void> {
    await bridgeDb.users.put(user);
  }
}

class IndexedDbReportsRepo implements ReportsRepository {
  async listAll(): Promise<ReportBackend[]> {
    const rows = await bridgeDb.reports.toArray();
    return rows.map((r) => normalizeReportBackend(r)).sort(sortBySentAtDesc);
  }

  async listByAuthorUserId(authorUserId: string): Promise<ReportBackend[]> {
    const id = authorUserId.trim();
    if (!id) return [];
    const rows = await bridgeDb.reports.toArray();
    return rows
      .filter((r) => {
        if (r.authorUserId === id) return true;
        if (id === 'teacher-1' && r.authorUserId === '1') return true;
        return false;
      })
      .map((r) => normalizeReportBackend(r))
      .sort(sortBySentAtDesc);
  }

  async get(id: string): Promise<ReportBackend | undefined> {
    const raw = await bridgeDb.reports.get(id);
    return raw ? normalizeReportBackend(raw) : undefined;
  }

  async put(report: ReportBackend): Promise<void> {
    await bridgeDb.reports.put(normalizeReportBackend(report));
  }

  async delete(id: string): Promise<void> {
    await bridgeDb.reports.delete(id);
  }
}

class IndexedDbBroadcastsRepo implements BroadcastsRepository {
  async listAll(): Promise<BroadcastBackend[]> {
    const rows = await bridgeDb.broadcasts.toArray();
    return rows.map((r) => normalizeBroadcastBackend(r)).sort(sortBySentAtDesc);
  }

  async listByAuthorUserId(authorUserId: string): Promise<BroadcastBackend[]> {
    const id = authorUserId.trim();
    if (!id) return [];
    const rows = await bridgeDb.broadcasts.toArray();
    return rows
      .filter((r) => {
        if (r.authorUserId === id) return true;
        if (id === 'teacher-1' && r.authorUserId === '1') return true;
        return false;
      })
      .map((r) => normalizeBroadcastBackend(r))
      .sort(sortBySentAtDesc);
  }

  async get(id: string): Promise<BroadcastBackend | undefined> {
    const raw = await bridgeDb.broadcasts.get(id);
    return raw ? normalizeBroadcastBackend(raw) : undefined;
  }

  async put(broadcast: BroadcastBackend): Promise<void> {
    await bridgeDb.broadcasts.put(normalizeBroadcastBackend(broadcast));
  }

  async delete(id: string): Promise<void> {
    await bridgeDb.broadcasts.delete(id);
  }
}

function sortBookingsByUpdatedDesc(a: ParentBookingBackend, b: ParentBookingBackend): number {
  const ta = Date.parse(a.updatedAt);
  const tb = Date.parse(b.updatedAt);
  const na = Number.isFinite(ta) ? ta : 0;
  const nb = Number.isFinite(tb) ? tb : 0;
  return nb - na;
}

class IndexedDbParentBookingsRepo implements ParentBookingsRepository {
  async listAll(): Promise<ParentBookingBackend[]> {
    const rows = await bridgeDb.parentBookings.toArray();
    return rows.map((r) => normalizeParentBookingBackend(r)).sort(sortBookingsByUpdatedDesc);
  }

  async get(id: string): Promise<ParentBookingBackend | undefined> {
    const raw = await bridgeDb.parentBookings.get(id);
    return raw ? normalizeParentBookingBackend(raw) : undefined;
  }

  async put(booking: ParentBookingBackend): Promise<void> {
    await bridgeDb.parentBookings.put(normalizeParentBookingBackend(booking));
  }

  async delete(id: string): Promise<void> {
    await bridgeDb.parentBookings.delete(id);
  }
}

class IndexedDbTeacherTodoListsRepo implements TeacherTodoListsRepository {
  async get(userId: string): Promise<TeacherTodoListBackend | undefined> {
    const id = userId.trim();
    if (!id) return undefined;
    const raw = await bridgeDb.teacherTodoLists.get(id);
    return raw ? normalizeTeacherTodoListBackend(raw) : undefined;
  }

  async put(doc: TeacherTodoListBackend): Promise<void> {
    await bridgeDb.teacherTodoLists.put(normalizeTeacherTodoListBackend(doc));
  }
}

function sortQuizByCreatedAtDesc(a: QuizBackend, b: QuizBackend): number {
  const ta = Date.parse(a.createdAt);
  const tb = Date.parse(b.createdAt);
  const na = Number.isFinite(ta) ? ta : 0;
  const nb = Number.isFinite(tb) ? tb : 0;
  return nb - na;
}

class IndexedDbQuizzesRepo implements QuizzesRepository {
  async listForParent(parentId: string): Promise<QuizBackend[]> {
    const pid = parentId.trim();
    if (!pid) return [];
    const rows = await bridgeDb.quizzes.toArray();
    return rows
      .filter((r) => r.parentId === pid)
      .map((r) => normalizeQuizBackend(r))
      .sort(sortQuizByCreatedAtDesc);
  }

  async listForParentAndLearningCard(parentId: string, learningCardId: string): Promise<QuizBackend[]> {
    const pid = parentId.trim();
    const cid = learningCardId.trim();
    if (!pid || !cid) return [];
    const rows = await bridgeDb.quizzes.toArray();
    return rows
      .filter((r) => r.parentId === pid && String(r.learningCardId ?? '').trim() === cid)
      .map((r) => normalizeQuizBackend(r))
      .sort(sortQuizByCreatedAtDesc);
  }

  async listForStudent(studentId: string): Promise<QuizBackend[]> {
    const sid = studentId.trim();
    if (!sid) return [];
    const rows = await bridgeDb.quizzes.toArray();
    return rows
      .filter((r) => r.studentId === sid)
      .map((r) => normalizeQuizBackend(r))
      .sort(sortQuizByCreatedAtDesc);
  }

  async listForStudentAndLearningCard(studentId: string, learningCardId: string): Promise<QuizBackend[]> {
    const sid = studentId.trim();
    const cid = learningCardId.trim();
    if (!sid || !cid) return [];
    const rows = await bridgeDb.quizzes.toArray();
    return rows
      .filter((r) => r.studentId === sid && String(r.learningCardId ?? '').trim() === cid)
      .map((r) => normalizeQuizBackend(r))
      .sort(sortQuizByCreatedAtDesc);
  }

  async get(id: string): Promise<QuizBackend | undefined> {
    const raw = await bridgeDb.quizzes.get(id);
    return raw ? normalizeQuizBackend(raw) : undefined;
  }

  async put(quiz: QuizBackend): Promise<void> {
    await bridgeDb.quizzes.put(normalizeQuizBackend(quiz));
  }

  async delete(id: string): Promise<void> {
    await bridgeDb.quizzes.delete(id);
  }
}

export class IndexedDbDataLayer implements DataLayer {
  readonly mode = 'indexeddb' as const;
  readonly learningCards = new IndexedDbLearningCardsRepo();
  readonly studentMoods = new IndexedDbStudentMoodsRepo();
  readonly users = new IndexedDbUsersRepo();
  readonly reports = new IndexedDbReportsRepo();
  readonly broadcasts = new IndexedDbBroadcastsRepo();
  readonly teacherTodoLists = new IndexedDbTeacherTodoListsRepo();
  readonly parentBookings = new IndexedDbParentBookingsRepo();
  readonly quizzes = new IndexedDbQuizzesRepo();
}
