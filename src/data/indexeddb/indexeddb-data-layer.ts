import { bridgeDb } from './bridge-db';
import type { DataLayer, LearningCardsRepository } from '../repositories';
import type { LearningCard, NewLearningCard } from '../types';

function nowIso(): string {
  return new Date().toISOString();
}

class IndexedDbLearningCardsRepo implements LearningCardsRepository {
  async list(): Promise<LearningCard[]> {
    return bridgeDb.learningCards.orderBy('createdAt').reverse().toArray();
  }

  async get(id: string): Promise<LearningCard | undefined> {
    return bridgeDb.learningCards.get(id);
  }

  async create(input: NewLearningCard): Promise<LearningCard> {
    const t = nowIso();
    const card: LearningCard = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: t,
      updatedAt: t,
    };
    await bridgeDb.learningCards.add(card);
    return card;
  }

  async update(card: LearningCard): Promise<void> {
    await bridgeDb.learningCards.put({
      ...card,
      updatedAt: nowIso(),
    });
  }

  async delete(id: string): Promise<void> {
    await bridgeDb.learningCards.delete(id);
  }
}

export class IndexedDbDataLayer implements DataLayer {
  readonly mode = 'indexeddb' as const;
  readonly learningCards = new IndexedDbLearningCardsRepo();
}
