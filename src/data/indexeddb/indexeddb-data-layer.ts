import { bridgeDb } from './bridge-db';
import type { DataLayer, LearningCardsRepository } from '../repositories';
import type { LearningCardBackend } from '../entity/learning-card-backend';

function sortByCreatedAtDesc(a: LearningCardBackend, b: LearningCardBackend): number {
  const ta = Date.parse(a.createdAt);
  const tb = Date.parse(b.createdAt);
  const na = Number.isFinite(ta) ? ta : 0;
  const nb = Number.isFinite(tb) ? tb : 0;
  return nb - na;
}

class IndexedDbLearningCardsRepo implements LearningCardsRepository {
  /**
   * TODO(auth): filter by `authorUserId === userId` (currently returns all rows — demo hack).
   * Uses `toArray()` + sort so older rows missing an index field still list reliably.
   */
  async listByUserId(_userId: string): Promise<LearningCardBackend[]> {
    const rows = await bridgeDb.learningCards.toArray();
    return rows.sort(sortByCreatedAtDesc);
  }

  async get(id: string): Promise<LearningCardBackend | undefined> {
    return bridgeDb.learningCards.get(id);
  }

  async put(card: LearningCardBackend): Promise<void> {
    await bridgeDb.learningCards.put(card);
  }

  async delete(id: string): Promise<void> {
    await bridgeDb.learningCards.delete(id);
  }
}

export class IndexedDbDataLayer implements DataLayer {
  readonly mode = 'indexeddb' as const;
  readonly learningCards = new IndexedDbLearningCardsRepo();
}
