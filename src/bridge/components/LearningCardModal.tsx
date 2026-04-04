import { useState } from 'react';
import { Check, ListChecks, Sparkles, Users } from 'lucide-react';
import { Checkbox, Label, Radio, RadioGroup } from 'react-aria-components';
import {
  DASH_STUDENTS,
  LEARNING_CARD_CLASS_OPTIONS,
  LEARNING_CARD_GRADE_OPTIONS,
  LEARNING_CARD_SUBJECT_OPTIONS,
} from '@/bridge/mockData';
import { mockGenerateLearningCard } from '@/bridge/mockLearningCardGenerate';
import { Button } from '@/bridge/components/ui/Button';
import { FieldSelect } from '@/bridge/components/ui/FieldSelect';
import { FieldTextArea } from '@/bridge/components/ui/FieldTextArea';
import { FieldTextInput } from '@/bridge/components/ui/FieldTextInput';
import { useBridge } from '@/bridge/BridgeContext';
import { cx } from '@/bridge/cx';
import type { LearningCardCreatePayload } from '@/bridge/types';
import { getDataLayer } from '@/data';
import {
  HARDCODED_LEARNING_CARD_AUTHOR_USER_ID,
  learningCardCreatePayloadToBackend,
} from '@/data/learning-card-mappers';

const WHOLE_CLASS_RECIPIENTS = 28;

const LS_KEY_CLASS = 'bridge-ed:learning-card:class-lesson';
const LS_KEY_GRADE = 'bridge-ed:learning-card:grade';
const LS_KEY_SUBJECT = 'bridge-ed:learning-card:subject';

function readStoredOption<T extends readonly string[]>(key: string, allowed: T, fallback: T[number]): T[number] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw && (allowed as readonly string[]).includes(raw)) return raw as T[number];
  } catch {
    /* ignore */
  }
  return fallback;
}

function persistSelect(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

const STEPS = [
  { id: 'input', label: 'Class input' },
  { id: 'draft', label: 'Generate & review' },
  { id: 'audience', label: 'Audience' },
] as const;

type Phase = 'input' | 'generating' | 'review' | 'audience' | 'confirm';

function stepIndex(phase: Phase): number {
  switch (phase) {
    case 'input':
      return 0;
    case 'generating':
    case 'review':
      return 1;
    case 'audience':
      return 2;
    case 'confirm':
      return 2;
    default:
      return 0;
  }
}

export function LearningCardModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  /** Called after a card is persisted. */
  onSaved?: () => void;
}) {
  const { currentUser } = useBridge();
  const [classLesson, setClassLesson] = useState<string>(() =>
    readStoredOption(LS_KEY_CLASS, LEARNING_CARD_CLASS_OPTIONS, LEARNING_CARD_CLASS_OPTIONS[0]),
  );
  const [grade, setGrade] = useState<string>(() =>
    readStoredOption(LS_KEY_GRADE, LEARNING_CARD_GRADE_OPTIONS, 'G9'),
  );
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState<string>(() =>
    readStoredOption(LS_KEY_SUBJECT, LEARNING_CARD_SUBJECT_OPTIONS, LEARNING_CARD_SUBJECT_OPTIONS[0]),
  );
  const [notes, setNotes] = useState('');

  const [phase, setPhase] = useState<Phase>('input');
  const [summary, setSummary] = useState('');
  const [actions, setActions] = useState<{ text: string; include: boolean }[]>([
    { text: '', include: true },
    { text: '', include: true },
    { text: '', include: true },
  ]);

  const [audienceMode, setAudienceMode] = useState<'class' | 'selected'>('class');
  const [selectedParents, setSelectedParents] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const s of DASH_STUDENTS) init[s.name] = true;
    return init;
  });

  const activeStep = stepIndex(phase);

  const recipientCount =
    audienceMode === 'class' ? WHOLE_CLASS_RECIPIENTS : Object.values(selectedParents).filter(Boolean).length;

  const gradeSubjectLine = [grade, subject].filter(Boolean).join(' · ');

  const canSubmitInput = Boolean(classLesson) && topic.trim().length > 0;

  async function confirmSendLearningCard() {
    const payload: LearningCardCreatePayload = {
      sentAt: Date.now(),
      classInput: {
        classLesson,
        grade,
        subject,
        topic: topic.trim(),
        notes: notes.trim(),
        gradeSubjectLine,
      },
      generated: {
        parentSummary: summary,
        tonightActions: actions.map((a) => ({ text: a.text, include: a.include })),
      },
      audience: {
        mode: audienceMode,
        recipientCount,
        ...(audienceMode === 'selected' ? { selectedParentsByStudent: { ...selectedParents } } : {}),
      },
    };
    const authorUserId =
      currentUser?.role === 'teacher' ? currentUser.id : HARDCODED_LEARNING_CARD_AUTHOR_USER_ID;
    const record = learningCardCreatePayloadToBackend(payload, authorUserId);
    try {
      await getDataLayer().learningCards.put(record);
      onSaved?.();
      onClose();
    } catch (e) {
      console.error('[LearningCard] failed to persist', e, record);
    }
  }

  const runGenerate = async () => {
    setPhase('generating');
    try {
      const draft = await mockGenerateLearningCard({
        classTitle: classLesson,
        topic: topic.trim(),
        gradeSubject: gradeSubjectLine,
        notes: notes.trim(),
      });
      setSummary(draft.summaryEn);
      setActions(
        draft.actions.map((text) => ({
          text,
          include: true,
        })),
      );
      setPhase('review');
    } catch {
      setPhase('input');
    }
  };

  const stepper = (
    <nav className="learning-card-steps" aria-label="Wizard steps">
      <ol className="learning-card-steps__list">
        {STEPS.map((s, i) => {
          const done = i < activeStep;
          const current = i === activeStep;
          const upcoming = i > activeStep;
          return (
            <li
              key={s.id}
              className={cx(
                'learning-card-steps__item',
                done && 'is-done',
                current && 'is-current',
                upcoming && 'is-upcoming',
              )}
              aria-current={current ? 'step' : undefined}
            >
              <span className="learning-card-steps__badge" aria-hidden="true">
                {done ? <Check className="learning-card-steps__check" strokeWidth={2.5} size={14} /> : i + 1}
              </span>
              <span className="learning-card-steps__label">{s.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );

  return (
    <>
      <div className="modal__header modal__header--learning-card">
        <h3 id="modal-learning-card-title" className="modal__title">
          New learning card
        </h3>
        <p className="modal__lede">
          Draft a parent-friendly card from your class notes, then choose who receives it. (Demo: not saved to a server.)
        </p>
      </div>

      <div className="learning-card-wizard">
          {stepper}
          <div className="learning-card-main">
      {phase === 'input' && (
        <form
          className="book-form learning-card-form"
          id="form-learning-card-input"
          onSubmit={(e) => {
            e.preventDefault();
            void runGenerate();
          }}
        >
          <div className="modal__scroll learning-card-main__scroll">
            <div className="learning-card-field-row">
              <FieldSelect
                id="lc-class-lesson"
                label="Class / lesson title"
                value={classLesson}
                onValueChange={(v) => {
                  setClassLesson(v);
                  persistSelect(LS_KEY_CLASS, v);
                }}
                options={LEARNING_CARD_CLASS_OPTIONS}
              />
              <FieldSelect
                id="lc-grade"
                label="Grade"
                value={grade}
                onValueChange={(v) => {
                  setGrade(v);
                  persistSelect(LS_KEY_GRADE, v);
                }}
                options={LEARNING_CARD_GRADE_OPTIONS}
              />
            </div>
            <FieldSelect
              id="lc-subject"
              label="Subject"
              value={subject}
              onValueChange={(v) => {
                setSubject(v);
                persistSelect(LS_KEY_SUBJECT, v);
              }}
              options={LEARNING_CARD_SUBJECT_OPTIONS}
            />
            <FieldTextInput
              id="lc-topic"
              label="Topic & focus"
              value={topic}
              onChange={setTopic}
              isRequired
              placeholder="e.g. Factoring quadratics, common pitfalls"
            />
            <FieldTextArea
              id="lc-notes"
              label="Extra notes for the generator (optional)"
              value={notes}
              onChange={setNotes}
              rows={3}
              placeholder="Anything the model should emphasize for families…"
            />
          </div>
          <div className="modal__footer">
            <div className="modal__actions">
              <Button variant="text" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" pill type="submit" disabled={!canSubmitInput}>
                Generate parent version
              </Button>
            </div>
          </div>
        </form>
      )}

      {phase === 'generating' && (
        <div className="modal__scroll learning-card-main__scroll learning-card-gen" role="status" aria-live="polite" aria-busy="true">
          <div className="learning-card-gen__inner">
            <div className="learning-card-gen__orb" aria-hidden="true">
              <Sparkles className="learning-card-gen__sparkle" strokeWidth={2} size={28} />
            </div>
            <p className="learning-card-gen__title">Generating parent summary…</p>
            <p className="learning-card-gen__hint">Drafting a short summary and tonight’s actions from your notes.</p>
            <div className="learning-card-gen__dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      {phase === 'review' && (
        <form
          className="book-form learning-card-form"
          id="form-learning-card-review"
          onSubmit={(e) => {
            e.preventDefault();
            setPhase('audience');
          }}
        >
          <div className="modal__scroll learning-card-main__scroll">
            <div className="learning-card-review-summary">
              <p className="field__label">Parent summary</p>
              <div className="learning-card-ai-hint" role="note">
                <div className="learning-card-ai-hint__icon-wrap" aria-hidden="true">
                  <Sparkles className="learning-card-ai-hint__icon" strokeWidth={2} size={18} />
                </div>
                <p className="learning-card-ai-hint__text">
                  Families will see this in their preferred language—we translate the summary automatically for each
                  parent.
                </p>
              </div>
              <FieldTextArea
                id="lc-summary"
                label="Parent summary"
                labelHidden
                value={summary}
                onChange={setSummary}
                rows={5}
              />
            </div>
            <fieldset className="field field--actions-pick">
              <legend className="field__label">Tonight’s actions (toggle what to include)</legend>
              <ul className="learning-card-actions">
                {actions.map((a, i) => (
                  <li key={i} className="learning-card-actions__row">
                    <Checkbox
                      isSelected={a.include}
                      onChange={(v) => {
                        setActions((prev) => prev.map((x, j) => (j === i ? { ...x, include: v } : x)));
                      }}
                      className="learning-card-actions__check learning-card-checkbox"
                      aria-label={`Include action ${i + 1}`}
                    />
                    <FieldTextArea
                      id={`lc-action-${i}`}
                      label={`Tonight action ${i + 1}`}
                      labelHidden
                      value={a.text}
                      onChange={(v) => {
                        setActions((prev) => prev.map((x, j) => (j === i ? { ...x, text: v } : x)));
                      }}
                      rows={2}
                      inputClassName="learning-card-actions__text"
                    />
                  </li>
                ))}
              </ul>
            </fieldset>
          </div>
          <div className="modal__footer">
            <div className="modal__actions">
              <Button variant="text" type="button" onClick={() => setPhase('input')}>
                Back
              </Button>
              <Button variant="primary" pill type="submit">
                Continue to audience
              </Button>
            </div>
          </div>
        </form>
      )}

      {phase === 'audience' && (
        <form
          className="book-form learning-card-form"
          id="form-learning-card-audience"
          onSubmit={(e) => {
            e.preventDefault();
            if (audienceMode === 'selected' && recipientCount === 0) return;
            setPhase('confirm');
          }}
        >
          <div className="modal__scroll learning-card-main__scroll">
            <RadioGroup
              value={audienceMode}
              onChange={(v) => setAudienceMode(v as 'class' | 'selected')}
              className="field field--audience-mode"
            >
              <Label className="field__label">Who should receive this card?</Label>
              <div className="learning-card-audience-cards">
                <Radio value="class" className="learning-card-audience-card">
                  <span className="learning-card-audience-card__icon" aria-hidden="true">
                    <Users strokeWidth={1.75} size={28} />
                  </span>
                  <span className="learning-card-audience-card__body">
                    <strong className="learning-card-audience-card__title">Whole class</strong>
                    <span className="learning-card-audience-card__sub">
                      All linked parents ({WHOLE_CLASS_RECIPIENTS})
                    </span>
                  </span>
                </Radio>
                <Radio value="selected" className="learning-card-audience-card">
                  <span className="learning-card-audience-card__icon" aria-hidden="true">
                    <ListChecks strokeWidth={1.75} size={28} />
                  </span>
                  <span className="learning-card-audience-card__body">
                    <strong className="learning-card-audience-card__title">Selected parents</strong>
                    <span className="learning-card-audience-card__sub">
                      Pick families from your roster (demo)
                    </span>
                  </span>
                </Radio>
              </div>
            </RadioGroup>
            {audienceMode === 'selected' && (
              <fieldset className="field">
                <legend className="field__label">Parents</legend>
                <ul className="learning-card-parent-list">
                  {DASH_STUDENTS.map((s) => (
                    <li key={s.name}>
                      <Checkbox
                        isSelected={selectedParents[s.name] ?? false}
                        onChange={(v) => setSelectedParents((prev) => ({ ...prev, [s.name]: v }))}
                        className="learning-card-parent-list__row learning-card-checkbox learning-card-parent-checkbox"
                      >
                        <span>
                          {s.parent} <span className="learning-card-parent-list__meta">({s.name})</span>
                        </span>
                      </Checkbox>
                    </li>
                  ))}
                </ul>
                {audienceMode === 'selected' && recipientCount === 0 && (
                  <p className="field__hint" role="alert">
                    Select at least one parent.
                  </p>
                )}
              </fieldset>
            )}
          </div>
          <div className="modal__footer">
            <div className="modal__actions">
              <Button variant="text" type="button" onClick={() => setPhase('review')}>
                Back
              </Button>
              <Button
                variant="primary"
                pill
                type="submit"
                disabled={audienceMode === 'selected' && recipientCount === 0}
              >
                Review send
              </Button>
            </div>
          </div>
        </form>
      )}

      {phase === 'confirm' && (
        <div className="book-form learning-card-form">
          <div className="modal__scroll learning-card-main__scroll">
            <div className="learning-card-confirm">
              <p className="learning-card-confirm__lead">You’re about to send this learning card.</p>
              <p className="learning-card-confirm__count">
                <strong>{recipientCount}</strong> {recipientCount === 1 ? 'family' : 'families'} will get a notification
                under <strong>Chat</strong> with BrigeEd AI Powered.
              </p>
              <ul className="learning-card-confirm__bullets">
                <li>
                  Summary: {summary.trim() ? 'Ready' : '—'}
                </li>
                <li>
                  Actions included: {actions.filter((a) => a.include && a.text.trim()).length} / {actions.length}
                </li>
                <li>
                  Audience: {audienceMode === 'class' ? 'Whole class' : 'Selected parents'}
                </li>
              </ul>
            </div>
          </div>
          <div className="modal__footer">
            <div className="modal__actions">
              <Button variant="text" type="button" onClick={() => setPhase('audience')}>
                Back
              </Button>
              <Button variant="primary" pill type="button" onClick={confirmSendLearningCard}>
                Send learning card
              </Button>
            </div>
          </div>
        </div>
      )}
          </div>
        </div>
    </>
  );
}
