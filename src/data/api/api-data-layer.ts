/**
 * Backend 对齐这一组即可（路径可按服务端调整）：
 * - GET    /learning-cards
 * - GET    /learning-cards/:id
 * - POST   /learning-cards
 * - PUT    /learning-cards/:id
 * - DELETE /learning-cards/:id
 */
import { ApiError, apiRequest } from './api-client';
import type {
  DataLayer,
  LearningCardsRepository,
  ReportsRepository,
  StudentMoodsRepository,
  UsersRepository,
} from '../repositories';
import type { LearningCardBackend } from '../entity/learning-card-backend';
import type { ReportBackend } from '../entity/report-backend';
import { normalizeLearningCardBackend } from '../learning-card-mappers';
import type { StudentMoodBackend } from '../entity/student-mood-backend';
import type { UserBackend } from '../entity/user-backend';

class ApiLearningCardsRepo implements LearningCardsRepository {
  async listByUserId(userId: string): Promise<LearningCardBackend[]> {
    if (!userId.trim()) return [];
    const rows = await apiRequest<LearningCardBackend[]>(
      'GET',
      `/learning-cards?authorUserId=${encodeURIComponent(userId)}`,
    );
    return rows.map((r) => normalizeLearningCardBackend(r));
  }

  async listForParentUser(parentUserId: string): Promise<LearningCardBackend[]> {
    if (!parentUserId.trim()) return [];
    const rows = await apiRequest<LearningCardBackend[]>(
      'GET',
      `/learning-cards?parentUserId=${encodeURIComponent(parentUserId)}`,
    );
    return rows.map((r) => normalizeLearningCardBackend(r));
  }

  async listForStudentUser(studentUserId: string): Promise<LearningCardBackend[]> {
    if (!studentUserId.trim()) return [];
    const rows = await apiRequest<LearningCardBackend[]>(
      'GET',
      `/learning-cards?studentUserId=${encodeURIComponent(studentUserId)}`,
    );
    return rows.map((r) => normalizeLearningCardBackend(r));
  }

  async get(id: string): Promise<LearningCardBackend | undefined> {
    try {
      const raw = await apiRequest<LearningCardBackend>('GET', `/learning-cards/${encodeURIComponent(id)}`);
      return normalizeLearningCardBackend(raw);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return undefined;
      throw e;
    }
  }

  async put(card: LearningCardBackend): Promise<void> {
    await apiRequest<void>('PUT', `/learning-cards/${encodeURIComponent(card.id)}`, card);
  }

  async delete(id: string): Promise<void> {
    await apiRequest<void>('DELETE', `/learning-cards/${encodeURIComponent(id)}`);
  }
}

/** Future: GET/PUT `/student-moods` — local demo uses IndexedDB only. */
class ApiStudentMoodsRepo implements StudentMoodsRepository {
  async get(id: string): Promise<StudentMoodBackend | undefined> {
    void id;
    return undefined;
  }

  async put(entry: StudentMoodBackend): Promise<void> {
    void entry;
    /* wire when API exists */
  }

  async listInLocalDateRange(start: string, end: string): Promise<StudentMoodBackend[]> {
    void start;
    void end;
    return [];
  }

  async getChildrenMood(parentUserId?: string): Promise<StudentMoodBackend[]> {
    void parentUserId;
    return [];
  }

  async delete(id: string): Promise<void> {
    void id;
    /* wire when API exists */
  }
}

/** Future: GET/PUT `/users` — local demo uses IndexedDB only. */
class ApiUsersRepo implements UsersRepository {
  async get(id: string): Promise<UserBackend | undefined> {
    void id;
    return undefined;
  }

  async list(): Promise<UserBackend[]> {
    return [];
  }

  async put(user: UserBackend): Promise<void> {
    void user;
    /* wire when API exists */
  }
}

/** Future: GET/PUT `/reports` — wire when API exists. */
class ApiReportsRepo implements ReportsRepository {
  async listAll(): Promise<ReportBackend[]> {
    return [];
  }

  async listByAuthorUserId(authorUserId: string): Promise<ReportBackend[]> {
    void authorUserId;
    return [];
  }

  async get(id: string): Promise<ReportBackend | undefined> {
    void id;
    return undefined;
  }

  async put(report: ReportBackend): Promise<void> {
    void report;
    /* wire when API exists */
  }

  async delete(id: string): Promise<void> {
    void id;
    /* wire when API exists */
  }
}

export class ApiDataLayer implements DataLayer {
  readonly mode = 'api' as const;
  readonly learningCards = new ApiLearningCardsRepo();
  readonly studentMoods = new ApiStudentMoodsRepo();
  readonly users = new ApiUsersRepo();
  readonly reports = new ApiReportsRepo();
}
