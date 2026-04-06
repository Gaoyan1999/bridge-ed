import Dexie, { type Table } from 'dexie';
import type { BroadcastBackend } from '../entity/broadcast-backend';
import type { LearningCardBackend } from '../entity/learning-card-backend';
import type { ReportBackend } from '../entity/report-backend';
import type { StudentMoodBackend } from '../entity/student-mood-backend';
import type { TeacherTodoListBackend } from '../entity/teacher-todo-list-backend';
import type { ParentBookingBackend } from '../entity/parent-booking-backend';
import type { QuizBackend } from '../entity/quiz-backend';
import type { UserBackend } from '../entity/user-backend';

export class BridgeEdDB extends Dexie {
  learningCards!: Table<LearningCardBackend, string>;
  studentMoods!: Table<StudentMoodBackend, string>;
  users!: Table<UserBackend, string>;
  reports!: Table<ReportBackend, string>;
  broadcasts!: Table<BroadcastBackend, string>;
  teacherTodoLists!: Table<TeacherTodoListBackend, string>;
  parentBookings!: Table<ParentBookingBackend, string>;
  quizzes!: Table<QuizBackend, string>;

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
    this.version(6).stores({
      learningCards: 'id, authorUserId, classId, createdAt, updatedAt, sentAt, sendStatus',
      studentMoods: 'id, studentId, localDate, createdAt, [studentId+localDate]',
      users: 'id, email, role',
    });
    this.version(7).stores({
      learningCards: 'id, authorUserId, classId, createdAt, updatedAt, sentAt',
      studentMoods: 'id, studentId, localDate, createdAt, [studentId+localDate]',
      users: 'id, email, role',
    });
    this.version(8).stores({
      learningCards: 'id, authorUserId, classId, createdAt, updatedAt, sentAt',
      studentMoods: 'id, studentId, localDate, createdAt, [studentId+localDate]',
      users: 'id, email, role',
      reports: 'id, authorUserId, createdAt, updatedAt, sentAt',
    });
    this.version(9).stores({
      learningCards: 'id, authorUserId, classId, createdAt, updatedAt, sentAt',
      studentMoods: 'id, studentId, localDate, createdAt, [studentId+localDate]',
      users: 'id, email, role',
      reports: 'id, authorUserId, createdAt, updatedAt, sentAt',
      broadcasts: 'id, authorUserId, createdAt, updatedAt, sentAt',
    });
    this.version(10).stores({
      learningCards: 'id, authorUserId, classId, createdAt, updatedAt, sentAt',
      studentMoods: 'id, studentId, localDate, createdAt, [studentId+localDate]',
      users: 'id, email, role',
      reports: 'id, authorUserId, createdAt, updatedAt, sentAt',
      broadcasts: 'id, authorUserId, createdAt, updatedAt, sentAt',
      teacherDashboardTodos: 'id, authorUserId, sortOrder, updatedAt, [authorUserId+sortOrder]',
    });
    this.version(11).stores({
      learningCards: 'id, authorUserId, classId, createdAt, updatedAt, sentAt',
      studentMoods: 'id, studentId, localDate, createdAt, [studentId+localDate]',
      users: 'id, email, role',
      reports: 'id, authorUserId, createdAt, updatedAt, sentAt',
      broadcasts: 'id, authorUserId, createdAt, updatedAt, sentAt',
      teacherTodoLists: 'userId, updatedAt',
    });
    this.version(12).stores({
      learningCards: 'id, authorUserId, classId, createdAt, updatedAt, sentAt',
      studentMoods: 'id, studentId, localDate, createdAt, [studentId+localDate]',
      users: 'id, email, role',
      reports: 'id, authorUserId, createdAt, updatedAt, sentAt',
      broadcasts: 'id, authorUserId, createdAt, updatedAt, sentAt',
      teacherTodoLists: 'userId, updatedAt',
      parentBookings: 'id, teacherId, parentId, status, updatedAt, [teacherId+status]',
    });
    this.version(13).stores({
      learningCards: 'id, authorUserId, classId, createdAt, updatedAt, sentAt',
      studentMoods: 'id, studentId, localDate, createdAt, [studentId+localDate]',
      users: 'id, email, role',
      reports: 'id, authorUserId, createdAt, updatedAt, sentAt',
      broadcasts: 'id, authorUserId, createdAt, updatedAt, sentAt',
      teacherTodoLists: 'userId, updatedAt',
      parentBookings: 'id, teacherId, parentId, status, updatedAt, [teacherId+status]',
      quizzes: 'id, parentId, studentId, createdAt, [parentId+studentId]',
    });
    this.version(14).stores({
      learningCards: 'id, authorUserId, classId, createdAt, updatedAt, sentAt',
      studentMoods: 'id, studentId, localDate, createdAt, [studentId+localDate]',
      users: 'id, email, role',
      reports: 'id, authorUserId, createdAt, updatedAt, sentAt',
      broadcasts: 'id, authorUserId, createdAt, updatedAt, sentAt',
      teacherTodoLists: 'userId, updatedAt',
      parentBookings: 'id, teacherId, parentId, status, updatedAt, [teacherId+status]',
      quizzes: 'id, parentId, studentId, learningCardId, createdAt, [parentId+studentId]',
    });
  }
}

export const bridgeDb = new BridgeEdDB();
