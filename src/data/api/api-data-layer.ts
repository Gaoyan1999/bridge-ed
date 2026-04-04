/**
 * Backend 对齐这一组即可（路径可按服务端调整）：
 * - GET    /learning-cards
 * - GET    /learning-cards/:id
 * - POST   /learning-cards
 * - PUT    /learning-cards/:id
 * - DELETE /learning-cards/:id
 */
import { ApiError, apiRequest } from './api-client';
import type { DataLayer, LearningCardsRepository, StudentMoodsRepository } from '../repositories';
import type { LearningCardBackend } from '../entity/learning-card-backend';
import type { StudentMoodBackend } from '../entity/student-mood-backend';

class ApiLearningCardsRepo implements LearningCardsRepository {
  async listByUserId(userId: string): Promise<LearningCardBackend[]> {
    const q = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return apiRequest<LearningCardBackend[]>('GET', `/learning-cards${q}`);
  }

  async get(id: string): Promise<LearningCardBackend | undefined> {
    try {
      return await apiRequest<LearningCardBackend>('GET', `/learning-cards/${encodeURIComponent(id)}`);
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
  async get(_id: string): Promise<StudentMoodBackend | undefined> {
    return undefined;
  }

  async put(_entry: StudentMoodBackend): Promise<void> {
    /* wire when API exists */
  }

  async listInLocalDateRange(_start: string, _end: string): Promise<StudentMoodBackend[]> {
    return [];
  }

  async getChildrenMood(_parentUserId?: string): Promise<StudentMoodBackend[]> {
    void _parentUserId;
    return [];
  }

  async delete(_id: string): Promise<void> {
    /* wire when API exists */
  }
}

export class ApiDataLayer implements DataLayer {
  readonly mode = 'api' as const;
  readonly learningCards = new ApiLearningCardsRepo();
  readonly studentMoods = new ApiStudentMoodsRepo();
}
