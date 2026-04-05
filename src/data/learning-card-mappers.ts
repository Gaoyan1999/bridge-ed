import type {
  LearningCardCreatePayload,
  LearningCardItem,
  LearningCardTonightAction,
  LearningCardTonightActionPreset,
} from '@/bridge/types';
import { LEARNING_CARD_TONIGHT_ACTION_PRESETS } from '@/bridge/types';
import {
  LEARNING_CARD_SCHEMA_VERSION,
  getDefaultLearningCardStudentFeedback,
  type LearningCardBackend,
  type LearningCardStatusBackend,
  type LearningCardStudentFeedback,
  type LearningCardStudentFinishedType,
  type LearningCardStudentLearningStatus,
} from '@/data/entity/learning-card-backend';

const STUDENT_FINISHED_TYPES = ['pretty_easy', 'think_get_it', 'challenge'] as const;

function isStudentFinishedType(v: unknown): v is LearningCardStudentFinishedType {
  return typeof v === 'string' && (STUDENT_FINISHED_TYPES as readonly string[]).includes(v);
}

function defaultLearningCardStatusBackend(sentAt: string | null): LearningCardStatusBackend {
  const sent = sentAt != null && String(sentAt).trim() !== '';
  return {
    status: sent ? 'sent' : 'draft',
    student: [],
  };
}

/** Drops legacy `parent` feedback rows; normalizes `student[]`. */
function normalizeLearningCardStatusBackend(raw: unknown, sentAt: string | null): LearningCardStatusBackend {
  const fallback = defaultLearningCardStatusBackend(sentAt);
  if (!raw || typeof raw !== 'object') return fallback;
  const r = raw as Record<string, unknown>;
  const st = r.status;
  const status =
    st === 'draft' || st === 'sent' || st === 'archived' ? st : fallback.status;
  const studentArr = Array.isArray(r.student) ? r.student : [];
  return { status, student: studentArr };
}

function isTonightPreset(v: unknown): v is LearningCardTonightActionPreset {
  return typeof v === 'string' && (LEARNING_CARD_TONIGHT_ACTION_PRESETS as readonly string[]).includes(v);
}

/** Ensures exactly three fixed presets; migrates legacy rows that only had `text` + `include`. */
export function normalizeTonightActions(raw: unknown): LearningCardTonightAction[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: LearningCardTonightAction[] = [];
  for (let i = 0; i < 3; i++) {
    const row = arr[i] as Partial<LearningCardTonightAction> & { preset?: unknown } | undefined;
    const preset = row && isTonightPreset(row.preset) ? row.preset : LEARNING_CARD_TONIGHT_ACTION_PRESETS[i]!;
    const include = typeof row?.include === 'boolean' ? row.include : true;
    const text = typeof row?.text === 'string' ? row.text : '';
    out.push({ preset, include, text });
  }
  return out;
}

/** Normalize stored card (legacy `tonightActions` / schema v1 to current). Strips removed `sendStatus`. */
export function normalizeLearningCardBackend(raw: LearningCardBackend): LearningCardBackend {
  const { sendStatus: _omit, ...rest } = raw as LearningCardBackend & { sendStatus?: unknown };
  return {
    ...rest,
    schemaVersion: LEARNING_CARD_SCHEMA_VERSION,
    tonightActions: normalizeTonightActions(rest.tonightActions),
    status: normalizeLearningCardStatusBackend(rest.status, rest.sentAt),
  };
}

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
    parentSummary: payload.generated.parentSummary,
    ...(payload.generated.translatedSummaries
      ? { translatedSummaries: payload.generated.translatedSummaries }
      : {}),
    ...(payload.generated.childKnowledge
      ? { childKnowledge: payload.generated.childKnowledge }
      : {}),
    tonightActions: payload.generated.tonightActions.map((a) => ({
      preset: a.preset,
      include: a.include,
      text: a.text,
    })),
    audience: {
      mode: payload.audience.mode === 'class' ? 'whole_class' : 'selected_parents',
      recipientCount: payload.audience.recipientCount,
      selectedStudentIds: selectedIds,
    },
    sentAt: sentAtIso,
    threadId,
    status: defaultLearningCardStatusBackend(sentAtIso),
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
    classLessonTitle: 'Week 14 - Sample',
    grade: 'G9',
    subject: 'Math',
    topic: `Sample learning card · ${new Date().toLocaleString()}`,
    teacherNotes: '',
    parentSummary: 'Test insert: parent summary appears here.',
    tonightActions: normalizeTonightActions([
      { preset: 'quiz', include: true, text: '' },
      { preset: 'parent_led_practice', include: true, text: '' },
      { preset: 'explain_to_parent', include: false, text: '' },
    ]),
    audience: {
      mode: 'whole_class',
      recipientCount: 28,
      selectedStudentIds: [],
    },
    sentAt: now,
    threadId,
    status: defaultLearningCardStatusBackend(now),
  };
}

/**
 * Build a full `LearningCardBackend` row from parent-dashboard mock data (fixtures / IndexedDB import).
 */
export function learningCardItemToBackendSnapshot(
  item: LearningCardItem,
  classLessonTitle: string,
): LearningCardBackend {
  const ts = new Date(item.at).toISOString();

  return {
    id: item.id,
    schemaVersion: LEARNING_CARD_SCHEMA_VERSION,
    createdAt: ts,
    updatedAt: ts,
    authorUserId: HARDCODED_LEARNING_CARD_AUTHOR_USER_ID,
    classId: null,
    classLessonTitle,
    grade: item.grade,
    subject: item.subject,
    topic: item.title,
    teacherNotes: '',
    parentSummary: item.summary,
    ...(item.translatedSummaries ? { translatedSummaries: { ...item.translatedSummaries } } : {}),
    ...(item.childKnowledge ? { childKnowledge: item.childKnowledge } : {}),
    tonightActions: normalizeTonightActions(item.tonightActions),
    audience: {
      mode: 'whole_class',
      recipientCount: 28,
      selectedStudentIds: [],
    },
    sentAt: ts,
    threadId: item.threadId,
    status: defaultLearningCardStatusBackend(ts),
  };
}

export function learningCardBackendToItem(backend: LearningCardBackend): LearningCardItem {
  const title = backend.topic.trim() || backend.classLessonTitle.trim() || 'Learning card';
  const grade = (backend.grade ?? '').trim();
  const subject = (backend.subject ?? '').trim() || '-';
  const summary = backend.parentSummary.trim();
  const atMs = Date.parse(backend.sentAt ?? backend.createdAt);
  return {
    id: backend.id,
    title,
    grade,
    subject,
    summary: summary.length > 0 ? summary : '-',
    ...(backend.translatedSummaries ? { translatedSummaries: { ...backend.translatedSummaries } } : {}),
    ...(backend.childKnowledge ? { childKnowledge: backend.childKnowledge } : {}),
    at: Number.isFinite(atMs) ? atMs : Date.now(),
    threadId: backend.threadId,
    tonightActions: normalizeTonightActions(backend.tonightActions),
  };
}

/**
 * Normalize one stored row: current shape, legacy `not_started` / `learning` / `finished`,
 * or mistaken parent-like `unread` / `read` / `actioned` on `status.student[]`.
 */
export function normalizeStudentFeedbackRow(
  raw: unknown,
  studentId: string,
): LearningCardStudentFeedback {
  const sid = studentId.trim();
  const def = getDefaultLearningCardStudentFeedback(sid);
  if (!raw || typeof raw !== 'object') return def;
  const r = raw as Record<string, unknown>;
  const id = typeof r.studentId === 'string' && r.studentId.trim() ? r.studentId.trim() : sid;

  if (r.status === 'unread' || r.status === 'read' || r.status === 'actioned') {
    let status: LearningCardStudentLearningStatus = 'not_started';
    if (r.status === 'read') status = 'learning';
    if (r.status === 'actioned') status = 'finished';
    const out: LearningCardStudentFeedback = {
      studentId: id,
      watchedVideo: typeof r.watchedVideo === 'boolean' ? r.watchedVideo : false,
      chatedWithAI: typeof r.chatedWithAI === 'boolean' ? r.chatedWithAI : false,
      status,
    };
    if (status === 'finished') {
      out.finishedType = isStudentFinishedType(r.finishedType) ? r.finishedType : 'think_get_it';
    }
    if (typeof r.feeling === 'string') out.feeling = r.feeling;
    return out;
  }

  let status: LearningCardStudentLearningStatus = 'not_started';
  if (r.status === 'learning') status = 'learning';
  else if (r.status === 'finished') status = 'finished';
  else if (r.status === 'not_started') status = 'not_started';

  const out: LearningCardStudentFeedback = {
    studentId: id,
    watchedVideo: typeof r.watchedVideo === 'boolean' ? r.watchedVideo : false,
    chatedWithAI: typeof r.chatedWithAI === 'boolean' ? r.chatedWithAI : false,
    status,
  };
  if (status === 'finished') {
    out.finishedType = isStudentFinishedType(r.finishedType) ? r.finishedType : 'think_get_it';
  }
  if (typeof r.feeling === 'string') out.feeling = r.feeling;
  return out;
}

/** Resolved row for this student on the card, or defaults when not yet stored. */
export function getStudentFeedbackForUser(card: LearningCardBackend, studentId: string): LearningCardStudentFeedback {
  const sid = studentId.trim();
  const row = card.status.student.find((s) => s.studentId === sid);
  return row ? normalizeStudentFeedbackRow(row, sid) : getDefaultLearningCardStudentFeedback(sid);
}

/** Merge student feedback into `card.status.student` and bump `updatedAt`. */
export function upsertStudentFeedbackOnCard(
  card: LearningCardBackend,
  patch: Partial<Omit<LearningCardStudentFeedback, 'studentId'>> & { studentId: string },
): LearningCardBackend {
  const sid = patch.studentId.trim();
  const list = [...card.status.student];
  const i = list.findIndex((s) => s.studentId === sid);
  const base = i >= 0 ? normalizeStudentFeedbackRow(list[i], sid) : getDefaultLearningCardStudentFeedback(sid);
  const merged: LearningCardStudentFeedback = { ...base, ...patch, studentId: sid };
  if (i >= 0) list[i] = merged;
  else list.push(merged);
  return {
    ...card,
    updatedAt: new Date().toISOString(),
    status: { ...card.status, student: list },
  };
}
