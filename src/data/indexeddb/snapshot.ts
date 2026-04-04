import { bridgeDb } from './bridge-db';
import {
  LEARNING_CARD_SCHEMA_VERSION,
  type LearningCardBackend,
} from '../entity/learning-card-backend';

export const BRIDGE_INDEXEDDB_SNAPSHOT_VERSION = 1 as const;

export type BridgeIndexedDbSnapshot = {
  snapshotVersion: typeof BRIDGE_INDEXEDDB_SNAPSHOT_VERSION;
  exportedAt: string;
  learningCards: LearningCardBackend[];
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

export async function exportIndexedDbSnapshot(): Promise<BridgeIndexedDbSnapshot> {
  const learningCards = await bridgeDb.learningCards.toArray();
  return {
    snapshotVersion: BRIDGE_INDEXEDDB_SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    learningCards,
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
 * Clears every object store in `bridge-ed`, then bulk-puts `learningCards`.
 * Expects export shape or a minimal `{ learningCards: [...] }` object.
 */
export async function importIndexedDbSnapshotFullReplace(data: unknown): Promise<void> {
  if (!isRecord(data)) {
    throw new Error('Invalid JSON: expected an object.');
  }
  const raw = data.learningCards;
  if (!Array.isArray(raw)) {
    throw new Error('Invalid JSON: missing learningCards array.');
  }
  const learningCards: LearningCardBackend[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!isLearningCardRow(row)) {
      throw new Error(`Invalid learningCards[${i}]: expected a full LearningCardBackend record.`);
    }
    learningCards.push(row);
  }

  await clearAllBridgeDbStores();
  if (learningCards.length > 0) {
    await bridgeDb.learningCards.bulkPut(learningCards);
  }
}
