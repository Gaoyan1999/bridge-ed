import Dexie, { type Table } from 'dexie';
import type { LearningCardBackend } from '../entity/learning-card-backend';

export class BridgeEdDB extends Dexie {
  learningCards!: Table<LearningCardBackend, string>;

  constructor() {
    super('bridge-ed');
    this.version(1).stores({
      learningCards: 'id, createdAt',
      parentFeedbacks: 'id, learningCardId, createdAt',
      studentSubmissions: 'id, learningCardId, createdAt',
    });
    this.version(2).stores({
      learningCards: 'id, createdAt',
    });
    this.version(3).stores({
      learningCards: 'id, authorUserId, createdAt, sendStatus',
    });
    this.version(4).stores({
      learningCards: 'id, authorUserId, classId, createdAt, updatedAt, sentAt, sendStatus',
    });
  }
}

export const bridgeDb = new BridgeEdDB();
