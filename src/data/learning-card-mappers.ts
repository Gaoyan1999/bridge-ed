import type { LearningCardCreatePayload, LearningCardItem } from '@/bridge/types';
import {
  LEARNING_CARD_SCHEMA_VERSION,
  type LearningCardBackend,
} from '@/data/entity/learning-card-backend';

/**
 * Fallback author when the wizard is opened without a teacher session (align with `reference/data.json` teachers).
 * Prefer `currentUser.id` from `LearningCardModal` when role is teacher.
 */
export const HARDCODED_LEARNING_CARD_AUTHOR_USER_ID = 'teacher-1';

export function newLearningCardIdPair(): { id: string; threadId: string } {
  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  return {
    id: `card-${suffix}`,
    threadId: `card-thread-${suffix}`,
  };
}

/** Build a **full** `LearningCardBackend` for IndexedDB / API from the wizard confirmation payload. */
export function learningCardCreatePayloadToBackend(
  payload: LearningCardCreatePayload,
  authorUserId: string = HARDCODED_LEARNING_CARD_AUTHOR_USER_ID,
): LearningCardBackend {
  const { id, threadId } = newLearningCardIdPair();
  const now = new Date().toISOString();
  const sentAtIso = new Date(payload.sentAt).toISOString();
  const ci = payload.classInput;
  const selectedIds =
    payload.audience.mode === 'selected' && payload.audience.selectedParentsByStudent
      ? Object.entries(payload.audience.selectedParentsByStudent)
          .filter(([, on]) => on)
          .map(([studentName]) => `student:${studentName}`)
      : [];

  return {
    id,
    schemaVersion: LEARNING_CARD_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    authorUserId,
    classId: null,
    classLessonTitle: ci.classLesson,
    grade: ci.grade,
    subject: ci.subject,
    topic: ci.topic,
    teacherNotes: ci.notes,
    gradeSubjectLine: ci.gradeSubjectLine,
    parentSummary: payload.generated.parentSummary,
    tonightActions: payload.generated.tonightActions.map((a) => ({ text: a.text, include: a.include })),
    audience: {
      mode: payload.audience.mode === 'class' ? 'whole_class' : 'selected_parents',
      recipientCount: payload.audience.recipientCount,
      selectedStudentIds: selectedIds,
    },
    sendStatus: 'sent',
    sentAt: sentAtIso,
    threadId,
  };
}

/** Debug / home page: one full row you can `put()` without going through the wizard. */
export function sampleLearningCardBackend(): LearningCardBackend {
  const { id, threadId } = newLearningCardIdPair();
  const now = new Date().toISOString();
  return {
    id,
    schemaVersion: LEARNING_CARD_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    authorUserId: HARDCODED_LEARNING_CARD_AUTHOR_USER_ID,
    classId: null,
    classLessonTitle: 'Week 14 — Sample',
    grade: 'G9',
    subject: 'Math',
    topic: `Sample learning card · ${new Date().toLocaleString()}`,
    teacherNotes: '',
    gradeSubjectLine: 'G9 · Math',
    parentSummary: '调试插入：家长摘要会出现在这里。',
    tonightActions: [
      { text: '和孩子一起回顾今日关键词', include: true },
      { text: '完成书上一道小题', include: true },
    ],
    audience: {
      mode: 'whole_class',
      recipientCount: 28,
      selectedStudentIds: [],
    },
    sendStatus: 'sent',
    sentAt: now,
    threadId,
  };
}

/**
 * Parse `LearningCardItem.subject` (e.g. `Math · Geometry`, or `Literature`) into backend `grade` + `subject`
 * so `learningCardBackendToItem` round-trips for list display.
 */
function parseGradeSubjectFromParentDashSubject(line: string): { grade: string; subject: string } {
  const sep = ' · ';
  const i = line.indexOf(sep);
  if (i === -1) {
    return { grade: '', subject: line };
  }
  return { grade: line.slice(0, i), subject: line.slice(i + sep.length) };
}

/**
 * Build a full `LearningCardBackend` row from parent-dashboard mock data (fixtures / IndexedDB import).
 */
export function learningCardItemToBackendSnapshot(
  item: LearningCardItem,
  classLessonTitle: string,
): LearningCardBackend {
  const { grade, subject } = parseGradeSubjectFromParentDashSubject(item.subject);
  const ts = new Date(item.at).toISOString();
  const gradeSubjectLine = [grade, subject].filter(Boolean).join(' · ') || subject;

  return {
    id: item.id,
    schemaVersion: LEARNING_CARD_SCHEMA_VERSION,
    createdAt: ts,
    updatedAt: ts,
    authorUserId: HARDCODED_LEARNING_CARD_AUTHOR_USER_ID,
    classId: null,
    classLessonTitle,
    grade,
    subject,
    topic: item.title,
    teacherNotes: '',
    gradeSubjectLine,
    parentSummary: item.summary,
    tonightActions: [
      {
        text: `Tonight: revisit “${item.title}” with one class or homework example.`,
        include: true,
      },
      {
        text: 'Ask your child to explain the main idea in their own words.',
        include: true,
      },
      {
        text: 'If it’s stuck after ~15 minutes, note the question and message the teacher.',
        include: true,
      },
    ],
    audience: {
      mode: 'whole_class',
      recipientCount: 28,
      selectedStudentIds: [],
    },
    sendStatus: 'sent',
    sentAt: ts,
    threadId: item.threadId,
  };
}

export function learningCardBackendToItem(backend: LearningCardBackend): LearningCardItem {
  const title = backend.topic.trim() || backend.classLessonTitle.trim() || 'Learning card';
  const subject =
    [backend.grade, backend.subject].filter(Boolean).join(' · ') || backend.subject;
  const summary = backend.parentSummary.trim();
  const atMs = Date.parse(backend.sentAt ?? backend.createdAt);
  return {
    id: backend.id,
    title,
    subject,
    status: 'New',
    summary: summary.length > 0 ? summary : '—',
    at: Number.isFinite(atMs) ? atMs : Date.now(),
    threadId: backend.threadId,
  };
}
