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
import type { UserBackend, UserRole } from '../entity/user-backend';
import { normalizeStudentMoodBackend } from '../student-mood-mappers';

export const BRIDGE_INDEXEDDB_SNAPSHOT_VERSION = 1 as const;

export type BridgeIndexedDbSnapshot = {
  snapshotVersion: typeof BRIDGE_INDEXEDDB_SNAPSHOT_VERSION;
  exportedAt: string;
  learningCards: LearningCardBackend[];
  studentMoods: StudentMoodBackend[];
  users: UserBackend[];
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
    typeof v.localDate === 'string' &&
    typeof v.pleasant === 'number' &&
    typeof v.mood === 'string' &&
    (STUDENT_MOOD_KINDS as readonly string[]).includes(v.mood) &&
    typeof v.note === 'string' &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string'
  );
}

/** Legacy snapshot export (schema v3) included redundant `authorUserId`. */
function isLegacyStudentMoodRowV3(v: unknown): boolean {
  if (!isRecord(v)) return false;
  return (
    v.schemaVersion === 3 &&
    typeof v.id === 'string' &&
    typeof v.studentId === 'string' &&
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

function parseStudentMoodImportRow(row: unknown, index: number): StudentMoodBackend {
  if (isStudentMoodRow(row)) return row;
  if (isLegacyStudentMoodRowV3(row)) {
    return normalizeStudentMoodBackend(row);
  }
  throw new Error(
    `Invalid studentMoods[${index}]: expected schema v${STUDENT_MOOD_SCHEMA_VERSION} (or legacy v3 with authorUserId).`,
  );
}

function isUserRole(v: unknown): v is UserRole {
  return v === 'teacher' || v === 'parent' || v === 'student';
}

function isUserRow(v: unknown): v is UserBackend {
  if (!isRecord(v)) return false;
  if (!isUserRole(v.role)) return false;
  if (typeof v.id !== 'string' || typeof v.name !== 'string' || typeof v.email !== 'string') return false;
  if (v.children !== undefined) {
    if (!Array.isArray(v.children)) return false;
    if (!v.children.every((c) => typeof c === 'string')) return false;
  }
  return true;
}

export async function exportIndexedDbSnapshot(): Promise<BridgeIndexedDbSnapshot> {
  const learningCards = await bridgeDb.learningCards.toArray();
  const studentMoods = await bridgeDb.studentMoods.toArray();
  const users = await bridgeDb.users.toArray();
  return {
    snapshotVersion: BRIDGE_INDEXEDDB_SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    learningCards,
    studentMoods,
    users,
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
 * Clears every object store in `bridge-ed`, then bulk-puts learning cards, student moods, and users.
 * `studentMoods` / `users` may be empty arrays; omit only when importing legacy JSON (treated as `[]`).
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

  const moodsRaw = Array.isArray(data.studentMoods) ? data.studentMoods : [];
  const studentMoods: StudentMoodBackend[] = [];
  for (let i = 0; i < moodsRaw.length; i++) {
    const row = moodsRaw[i];
    studentMoods.push(parseStudentMoodImportRow(row, i));
  }

  const usersRaw = Array.isArray(data.users) ? data.users : [];
  const users: UserBackend[] = [];
  for (let i = 0; i < usersRaw.length; i++) {
    const row = usersRaw[i];
    if (!isUserRow(row)) {
      throw new Error(`Invalid users[${i}]: expected a full UserBackend record.`);
    }
    users.push(row);
  }

  await clearAllBridgeDbStores();
  if (learningCards.length > 0) {
    await bridgeDb.learningCards.bulkPut(learningCards);
  }
  if (studentMoods.length > 0) {
    await bridgeDb.studentMoods.bulkPut(studentMoods);
  }
  if (users.length > 0) {
    await bridgeDb.users.bulkPut(users);
  }
}
