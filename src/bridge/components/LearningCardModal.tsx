import { useState } from 'react';
import { Check, ListChecks, Sparkles, Users } from 'lucide-react';
import { Checkbox, Label, Radio, RadioGroup } from 'react-aria-components';
import {
  DASH_STUDENTS,
  LEARNING_CARD_CLASS_OPTIONS,
  LEARNING_CARD_GRADE_OPTIONS,
  LEARNING_CARD_SUBJECT_OPTIONS,
} from '@/bridge/mockData';
import { useBridge } from '@/bridge/BridgeContext';
import { generateLearningCardDraft } from '@/bridge/learningCardApi';
import { Button } from '@/bridge/components/ui/Button';
import { FieldSelect } from '@/bridge/components/ui/FieldSelect';
import { FieldTextArea } from '@/bridge/components/ui/FieldTextArea';
import { FieldTextInput } from '@/bridge/components/ui/FieldTextInput';
import { cx } from '@/bridge/cx';
import type { LearningCardCreatePayload, LearningCardTonightAction } from '@/bridge/types';
import {
  LEARNING_CARD_TONIGHT_ACTION_PRESETS,
  LEARNING_CARD_TONIGHT_PRESET_LABELS,
} from '@/bridge/types';
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
  const [warning, setWarning] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tonightActions, setTonightActions] = useState<LearningCardTonightAction[]>(() =>
    LEARNING_CARD_TONIGHT_ACTION_PRESETS.map((preset) => ({
      preset,
      include: true,
      text: '',
    })),
  );

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
        tonightActions: tonightActions.map((a) => ({
          preset: a.preset,
          include: a.include,
          text: a.text,
        })),
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
      throw e;
    }
  }

  const runGenerate = async () => {
    setPhase('generating');
    setWarning(null);
    try {
      const draft = await generateLearningCardDraft({
        classTitle: classLesson,
        topic: topic.trim(),
        grade,
        subject,
        gradeSubject: gradeSubjectLine,
        notes: notes.trim(),
      });
      setSummary(draft.summaryEn);
      setWarning(draft.warning ?? null);
      setPhase('review');
    } catch (e) {
      setWarning(e instanceof Error ? e.message : 'Generation failed.');
      setPhase('input');
    }
  };

  const sendLearningCard = async () => {
    const teacherSummary = summary.trim();
    const selectedActionCount = tonightActions.filter((action) => action.include).length;
    if (!teacherSummary || selectedActionCount === 0) {
      setSaveError('Add a summary and select at least one action before sending.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await confirmSendLearningCard();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save learning card.');
    } finally {
      setIsSaving(false);
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
          Draft a parent-friendly card from your class notes, then choose who receives it.
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
            {warning && (
              <p className="field__hint" role="alert">
                {warning}
              </p>
            )}
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
              placeholder="Anything the model should emphasize for families..."
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
            <p className="learning-card-gen__title">Generating parent summary...</p>
            <p className="learning-card-gen__hint">Drafting a short parent summary from your notes.</p>
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
              {warning && (
                <p className="field__hint" role="status">
                  {warning}
                </p>
              )}
              <div className="learning-card-ai-hint" role="note">
                <div className="learning-card-ai-hint__icon-wrap" aria-hidden="true">
                  <Sparkles className="learning-card-ai-hint__icon" strokeWidth={2} size={18} />
                </div>
                <p className="learning-card-ai-hint__text">
                  Families will see this in their preferred language - we translate the summary automatically for each
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
            <fieldset className="field field--actions-pick field--actions-pick--grouped" aria-labelledby="lc-tonight-heading">
              <p id="lc-tonight-heading" className="learning-card-actions-section__kicker">
                Tonight&apos;s actions
              </p>              
              <div className="learning-card-actions-group">
                <ul className="learning-card-actions learning-card-actions--presets">
                  {tonightActions.map((row, idx) => {
                    const copy = LEARNING_CARD_TONIGHT_PRESET_LABELS[row.preset];
                    const isLast = idx === tonightActions.length - 1;
                    return (
                      <li
                        key={row.preset}
                        className={cx(
                          'learning-card-actions__row',
                          'learning-card-actions__row--preset',
                          isLast && 'learning-card-actions__row--last',
                        )}
                      >
                        <Checkbox
                          isSelected={row.include}
                          onChange={(v) => {
                            setTonightActions((prev) =>
                              prev.map((x) => (x.preset === row.preset ? { ...x, include: v } : x)),
                            );
                          }}
                          className="learning-card-actions__check learning-card-checkbox learning-card-checkbox--round"
                          aria-label={`Include: ${copy.title}`}
                        />
                        <div className="learning-card-actions__preset-body">
                          <span className="learning-card-actions__preset-title">{copy.title}</span>
                          <span className="learning-card-actions__preset-desc">{copy.description}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
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
              <p className="learning-card-confirm__lead">You&apos;re about to send this learning card.</p>
              <p className="learning-card-confirm__count">
                <strong>{recipientCount}</strong> {recipientCount === 1 ? 'family' : 'families'} will get a notification
                under <strong>Knowledge</strong> powered by BridgeEd AI.
              </p>
              <ul className="learning-card-confirm__bullets">
                <li>
                  Summary: {summary.trim() ? 'Ready' : '-'}
                </li>
                <li>
                  Tonight&apos;s actions selected: {tonightActions.filter((a) => a.include).length} /{' '}
                  {LEARNING_CARD_TONIGHT_ACTION_PRESETS.length}
                </li>
                <li>
                  Audience: {audienceMode === 'class' ? 'Whole class' : 'Selected parents'}
                </li>
              </ul>
              {saveError && (
                <p className="field__hint" role="alert">
                  {saveError}
                </p>
              )}
            </div>
          </div>
          <div className="modal__footer">
            <div className="modal__actions">
              <Button variant="text" type="button" onClick={() => setPhase('audience')}>
                Back
              </Button>
              <Button
                variant="primary"
                pill
                type="button"
                onClick={() => void sendLearningCard()}
                disabled={isSaving}
              >
                {isSaving ? 'Sending...' : 'Send learning card'}
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
