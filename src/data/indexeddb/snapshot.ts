import { bridgeDb } from './bridge-db';
import {
  LEARNING_CARD_SCHEMA_VERSION,
  type LearningCardBackend,
} from '../entity/learning-card-backend';
import { BROADCAST_SCHEMA_VERSION, type BroadcastBackend } from '../entity/broadcast-backend';
import { REPORT_SCHEMA_VERSION, type ReportBackend } from '../entity/report-backend';
import {
  STUDENT_MOOD_KINDS,
  STUDENT_MOOD_SCHEMA_VERSION,
  type StudentMoodBackend,
} from '../entity/student-mood-backend';
import type { UserBackend, UserRole } from '../entity/user-backend';
import type { QuizBackend } from '../entity/quiz-backend';
import { normalizeLearningCardBackend } from '../learning-card-mappers';
import { normalizeQuizBackend, type QuizBackendInput } from '../quiz-mappers';
import { normalizeBroadcastBackend } from '../broadcast-mappers';
import { normalizeReportBackend } from '../report-mappers';
import { normalizeStudentMoodBackend } from '../student-mood-mappers';

export const BRIDGE_INDEXEDDB_SNAPSHOT_VERSION = 4 as const;

export type BridgeIndexedDbSnapshot = {
  snapshotVersion: typeof BRIDGE_INDEXEDDB_SNAPSHOT_VERSION;
  exportedAt: string;
  learningCards: LearningCardBackend[];
  studentMoods: StudentMoodBackend[];
  users: UserBackend[];
  reports: ReportBackend[];
  broadcasts: BroadcastBackend[];
  /** Structured worksheets from Knowledge quiz flow (`quizzes` store). */
  quizzes: QuizBackend[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isLearningCardRow(v: unknown): v is LearningCardBackend {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === 'string' &&
    (v.schemaVersion === 1 ||
      v.schemaVersion === 3 ||
      v.schemaVersion === LEARNING_CARD_SCHEMA_VERSION) &&
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
    return normalizeStudentMoodBackend(row as Parameters<typeof normalizeStudentMoodBackend>[0]);
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

function isReportRow(v: unknown): v is ReportBackend {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === 'string' &&
    v.schemaVersion === REPORT_SCHEMA_VERSION &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string' &&
    typeof v.authorUserId === 'string' &&
    typeof v.sentAt === 'string' &&
    typeof v.title === 'string' &&
    typeof v.summary === 'string' &&
    typeof v.body === 'string' &&
    isRecord(v.audience) &&
    typeof v.audience.toStudents === 'boolean' &&
    typeof v.audience.toParents === 'boolean'
  );
}

function isBroadcastRow(v: unknown): v is BroadcastBackend {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === 'string' &&
    v.schemaVersion === BROADCAST_SCHEMA_VERSION &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string' &&
    typeof v.authorUserId === 'string' &&
    typeof v.sentAt === 'string' &&
    typeof v.title === 'string' &&
    typeof v.body === 'string' &&
    isRecord(v.audience) &&
    typeof v.audience.toStudents === 'boolean' &&
    typeof v.audience.toParents === 'boolean'
  );
}

function isQuizRow(v: unknown): v is QuizBackendInput {
  if (!isRecord(v)) return false;
  if (typeof v.id !== 'string' || typeof v.parentId !== 'string' || typeof v.studentId !== 'string') return false;
  if (v.learningCardId !== undefined && typeof v.learningCardId !== 'string') return false;
  if (typeof v.createdAt !== 'string') return false;
  if (v.status !== 'pending' && v.status !== 'completed') return false;
  if (!Array.isArray(v.questions)) return false;
  for (const q of v.questions) {
    if (!isRecord(q)) return false;
    if (typeof q.question !== 'string' || !Array.isArray(q.options)) return false;
    if (!q.options.every((o) => typeof o === 'string')) return false;
    if (typeof q.correctAnswer !== 'string') return false;
  }
  return true;
}

export async function exportIndexedDbSnapshot(): Promise<BridgeIndexedDbSnapshot> {
  const learningCards = await bridgeDb.learningCards.toArray();
  const studentMoods = await bridgeDb.studentMoods.toArray();
  const users = await bridgeDb.users.toArray();
  const reports = await bridgeDb.reports.toArray();
  const broadcasts = await bridgeDb.broadcasts.toArray();
  const quizzes = await bridgeDb.quizzes.toArray();
  return {
    snapshotVersion: BRIDGE_INDEXEDDB_SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    learningCards,
    studentMoods,
    users,
    reports,
    broadcasts,
    quizzes,
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
 * Clears every object store in `bridge-ed`, then bulk-puts learning cards, student moods, users, reports, broadcasts, and quizzes.
 * `studentMoods` / `users` / `reports` / `broadcasts` / `quizzes` may be empty arrays; omit only when importing legacy JSON (treated as `[]`).
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
    learningCards.push(normalizeLearningCardBackend(row));
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

  const reportsRaw = Array.isArray(data.reports) ? data.reports : [];
  const reports: ReportBackend[] = [];
  for (let i = 0; i < reportsRaw.length; i++) {
    const row = reportsRaw[i];
    if (!isReportRow(row)) {
      throw new Error(`Invalid reports[${i}]: expected a full ReportBackend record.`);
    }
    reports.push(normalizeReportBackend(row));
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
  if (reports.length > 0) {
    await bridgeDb.reports.bulkPut(reports);
  }

  const broadcastsRaw = Array.isArray(data.broadcasts) ? data.broadcasts : [];
  const broadcasts: BroadcastBackend[] = [];
  for (let i = 0; i < broadcastsRaw.length; i++) {
    const row = broadcastsRaw[i];
    if (!isBroadcastRow(row)) {
      throw new Error(`Invalid broadcasts[${i}]: expected a full BroadcastBackend record.`);
    }
    broadcasts.push(normalizeBroadcastBackend(row));
  }
  if (broadcasts.length > 0) {
    await bridgeDb.broadcasts.bulkPut(broadcasts);
  }

  const quizzesRaw = Array.isArray(data.quizzes) ? data.quizzes : [];
  const quizzes: QuizBackend[] = [];
  for (let i = 0; i < quizzesRaw.length; i++) {
    const row = quizzesRaw[i];
    if (!isQuizRow(row)) {
      throw new Error(`Invalid quizzes[${i}]: expected a full QuizBackend record.`);
    }
    quizzes.push(normalizeQuizBackend(row));
  }
  if (quizzes.length > 0) {
    await bridgeDb.quizzes.bulkPut(quizzes);
  }
}
