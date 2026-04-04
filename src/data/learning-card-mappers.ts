import type {
  LearningCardCreatePayload,
  LearningCardItem,
  LearningCardTonightAction,
  LearningCardTonightActionPreset,
} from '@/bridge/types';
import { LEARNING_CARD_TONIGHT_ACTION_PRESETS } from '@/bridge/types';
import {
  LEARNING_CARD_SCHEMA_VERSION,
  type LearningCardBackend,
} from '@/data/entity/learning-card-backend';

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

/** Normalize stored card (legacy `tonightActions` / schema v1 to current). */
export function normalizeLearningCardBackend(card: LearningCardBackend): LearningCardBackend {
  return {
    ...card,
    schemaVersion: LEARNING_CARD_SCHEMA_VERSION,
    tonightActions: normalizeTonightActions(card.tonightActions),
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
    sendStatus: 'sent',
    sentAt: now,
    threadId,
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
    tonightActions: normalizeTonightActions(item.tonightActions),
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
  const grade = (backend.grade ?? '').trim();
  const subject = (backend.subject ?? '').trim() || '-';
  const summary = backend.parentSummary.trim();
  const atMs = Date.parse(backend.sentAt ?? backend.createdAt);
  return {
    id: backend.id,
    title,
    grade,
    subject,
    status: 'New',
    summary: summary.length > 0 ? summary : '-',
    at: Number.isFinite(atMs) ? atMs : Date.now(),
    threadId: backend.threadId,
    tonightActions: normalizeTonightActions(backend.tonightActions),
  };
}
