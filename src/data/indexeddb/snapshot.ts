import { bridgeDb } from './bridge-db';
import {
  LEARNING_CARD_SCHEMA_VERSION,
  type LearningCardBackend,
} from '../entity/learning-card-backend';
import {
  STUDENT_MOOD_KINDS,
  STUDENT_MOOD_SCHEMA_VERSION,
  type StudentMoodBackend,
} from '../entity/student-mood-backend';

export const BRIDGE_INDEXEDDB_SNAPSHOT_VERSION = 1 as const;

export type BridgeIndexedDbSnapshot = {
  snapshotVersion: typeof BRIDGE_INDEXEDDB_SNAPSHOT_VERSION;
  exportedAt: string;
  learningCards: LearningCardBackend[];
  studentMoods: StudentMoodBackend[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isLearningCardRow(v: unknown): v is LearningCardBackend {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === 'string' &&
    v.schemaVersion === LEARNING_CARD_SCHEMA_VERSION &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string'
  );
}

function isStudentMoodRow(v: unknown): v is StudentMoodBackend {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === 'string' &&
    v.schemaVersion === STUDENT_MOOD_SCHEMA_VERSION &&
    typeof v.studentId === 'string' &&
    typeof v.studentDisplayName === 'string' &&
    typeof v.localDate === 'string' &&
    typeof v.pleasant === 'number' &&
    typeof v.mood === 'string' &&
    (STUDENT_MOOD_KINDS as readonly string[]).includes(v.mood) &&
    typeof v.note === 'string' &&
    typeof v.authorUserId === 'string' &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string'
  );
}

export async function exportIndexedDbSnapshot(): Promise<BridgeIndexedDbSnapshot> {
  const learningCards = await bridgeDb.learningCards.toArray();
  const studentMoods = await bridgeDb.studentMoods.toArray();
  return {
    snapshotVersion: BRIDGE_INDEXEDDB_SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    learningCards,
    studentMoods,
  };
}

async function clearAllBridgeDbStores(): Promise<void> {
  const names = bridgeDb.tables.map((t) => t.name);
  if (names.length === 0) return;
  await bridgeDb.transaction('rw', names, async () => {
    for (const table of bridgeDb.tables) {
      await table.clear();
    }
  });
}

/**
 * Clears every object store in `bridge-ed`, then bulk-puts learning cards and student moods.
 * `learningCards` and `studentMoods` may be empty arrays; omit `studentMoods` only when importing legacy JSON (treated as `[]`).
 */
export async function importIndexedDbSnapshotFullReplace(data: unknown): Promise<void> {
  if (!isRecord(data)) {
    throw new Error('Invalid JSON: expected an object.');
  }
  const rawCards = data.learningCards;
  if (!Array.isArray(rawCards)) {
    throw new Error('Invalid JSON: missing learningCards array.');
  }
  const learningCards: LearningCardBackend[] = [];
  for (let i = 0; i < rawCards.length; i++) {
    const row = rawCards[i];
    if (!isLearningCardRow(row)) {
      throw new Error(`Invalid learningCards[${i}]: expected a full LearningCardBackend record.`);
    }
    learningCards.push(row);
  }

  const rawMoods = data.studentMoods;
  const moodsRaw = Array.isArray(rawMoods) ? rawMoods : [];
  const studentMoods: StudentMoodBackend[] = [];
  for (let i = 0; i < moodsRaw.length; i++) {
    const row = moodsRaw[i];
    if (!isStudentMoodRow(row)) {
      throw new Error(`Invalid studentMoods[${i}]: expected a full StudentMoodBackend record.`);
    }
    studentMoods.push(row);
  }

  await clearAllBridgeDbStores();
  if (learningCards.length > 0) {
    await bridgeDb.learningCards.bulkPut(learningCards);
  }
  if (studentMoods.length > 0) {
    await bridgeDb.studentMoods.bulkPut(studentMoods);
  }
}
