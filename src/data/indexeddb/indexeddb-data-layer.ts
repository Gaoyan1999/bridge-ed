import { bridgeDb } from './bridge-db';
import type {
  BroadcastsRepository,
  DataLayer,
  LearningCardsRepository,
  ReportsRepository,
  StudentMoodsRepository,
  UsersRepository,
} from '../repositories';
import type { BroadcastBackend } from '../entity/broadcast-backend';
import type { LearningCardBackend } from '../entity/learning-card-backend';
import type { ReportBackend } from '../entity/report-backend';
import { normalizeBroadcastBackend } from '../broadcast-mappers';
import { normalizeLearningCardBackend } from '../learning-card-mappers';
import { normalizeReportBackend } from '../report-mappers';
import type { StudentMoodBackend } from '../entity/student-mood-backend';
import type { UserBackend } from '../entity/user-backend';
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

export class IndexedDbDataLayer implements DataLayer {
  readonly mode = 'indexeddb' as const;
  readonly learningCards = new IndexedDbLearningCardsRepo();
  readonly studentMoods = new IndexedDbStudentMoodsRepo();
  readonly users = new IndexedDbUsersRepo();
  readonly reports = new IndexedDbReportsRepo();
  readonly broadcasts = new IndexedDbBroadcastsRepo();
}
