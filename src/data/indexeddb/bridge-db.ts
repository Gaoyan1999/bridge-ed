import Dexie, { type Table } from 'dexie';
import type { LearningCard } from '../types';

export class BridgeEdDB extends Dexie {
  learningCards!: Table<LearningCard, string>;

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
  }
}

export const bridgeDb = new BridgeEdDB();
