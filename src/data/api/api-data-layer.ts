/**
 * Backend 对齐这一组即可（路径可按服务端调整）：
 * - GET    /learning-cards
 * - GET    /learning-cards/:id
 * - POST   /learning-cards
 * - PUT    /learning-cards/:id
 * - DELETE /learning-cards/:id
 */
import { ApiError, apiRequest } from './api-client';
import type { DataLayer, LearningCardsRepository } from '../repositories';
import type { LearningCard, NewLearningCard } from '../types';

class ApiLearningCardsRepo implements LearningCardsRepository {
  async list(): Promise<LearningCard[]> {
    return apiRequest<LearningCard[]>('GET', '/learning-cards');
  }

  async get(id: string): Promise<LearningCard | undefined> {
    try {
      return await apiRequest<LearningCard>('GET', `/learning-cards/${encodeURIComponent(id)}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return undefined;
      throw e;
    }
  }

  async create(input: NewLearningCard): Promise<LearningCard> {
    return apiRequest<LearningCard>('POST', '/learning-cards', input);
  }

  async update(card: LearningCard): Promise<void> {
    await apiRequest<void>('PUT', `/learning-cards/${encodeURIComponent(card.id)}`, card);
  }

  async delete(id: string): Promise<void> {
    await apiRequest<void>('DELETE', `/learning-cards/${encodeURIComponent(id)}`);
  }
}

export class ApiDataLayer implements DataLayer {
  readonly mode = 'api' as const;
  readonly learningCards = new ApiLearningCardsRepo();
}
