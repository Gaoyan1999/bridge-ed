import { bridgeDb } from './bridge-db';
import type { DataLayer, LearningCardsRepository, StudentMoodsRepository } from '../repositories';
import type { LearningCardBackend } from '../entity/learning-card-backend';
import type { StudentMoodBackend } from '../entity/student-mood-backend';
import { normalizeStudentMoodBackend } from '../student-mood-mappers';

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

  async getChildrenMood(_parentUserId?: string): Promise<StudentMoodBackend[]> {
    void _parentUserId;
    const rows = await bridgeDb.studentMoods.toArray();
    return rows
      .map((r) => normalizeStudentMoodBackend(r))
      .sort((a, b) => {
        const c = a.localDate.localeCompare(b.localDate);
        if (c !== 0) return c;
        return a.studentId.localeCompare(b.studentId);
      });
  }

  async delete(id: string): Promise<void> {
    await bridgeDb.studentMoods.delete(id);
  }
}

export class IndexedDbDataLayer implements DataLayer {
  readonly mode = 'indexeddb' as const;
  readonly learningCards = new IndexedDbLearningCardsRepo();
  readonly studentMoods = new IndexedDbStudentMoodsRepo();
}
