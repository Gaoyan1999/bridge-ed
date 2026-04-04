import Dexie, { type Table } from 'dexie';
import type { LearningCardBackend } from '../entity/learning-card-backend';
import type { StudentMoodBackend } from '../entity/student-mood-backend';

export class BridgeEdDB extends Dexie {
  learningCards!: Table<LearningCardBackend, string>;
  studentMoods!: Table<StudentMoodBackend, string>;

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
    this.version(5).stores({
      learningCards: 'id, authorUserId, classId, createdAt, updatedAt, sentAt, sendStatus',
      studentMoods: 'id, studentId, localDate, createdAt, [studentId+localDate]',
    });
  }
}

export const bridgeDb = new BridgeEdDB();
