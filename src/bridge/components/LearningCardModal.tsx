import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ListChecks, Sparkles, Users } from 'lucide-react';
import { Checkbox, Label, Radio, RadioGroup } from 'react-aria-components';
import {
  DASH_STUDENTS,
  LEARNING_CARD_CLASS_OPTIONS,
  LEARNING_CARD_GRADE_OPTIONS,
  LEARNING_CARD_SUBJECT_OPTIONS,
} from '@/bridge/mockData';
import { useBridge } from '@/bridge/BridgeContext';
import { getDataLayer, getLlmApi } from '@/data';
import { resolveParentSummaryForDisplay, uiLangFromI18n } from '@/data';
import { Button } from '@/bridge/components/ui/Button';
import { FieldSelect } from '@/bridge/components/ui/FieldSelect';
import { LearningCardParentPanelTeacher } from '@/bridge/components/LearningCardParentPanel';
import { FieldTextArea } from '@/bridge/components/ui/FieldTextArea';
import { FieldTextInput } from '@/bridge/components/ui/FieldTextInput';
import { cx } from '@/bridge/cx';
import type {
  LearningCardChildKnowledge,
  LearningCardCreatePayload,
  LearningCardTonightAction,
  LearningCardTranslatedSummaries,
} from '@/bridge/types';
import { LEARNING_CARD_TONIGHT_ACTION_PRESETS } from '@/bridge/types';
import {
  HARDCODED_LEARNING_CARD_AUTHOR_USER_ID,
  learningCardCreatePayloadToBackend,
} from '@/data/learning-card-mappers';
import { Markdown } from '@/bridge/components/Markdown/Markdown';
import { discoveryPlainTextToMarkdown } from '@/bridge/discoveryPlainTextToMarkdown';

const WHOLE_CLASS_RECIPIENTS = 28;

const LS_KEY_GRADE = 'bridge-ed:learning-card:grade';
const LS_KEY_SUBJECT = 'bridge-ed:learning-card:subject';

/** Class / lesson title UI is commented out — backend still expects `classLesson` / `classTitle`. */
const DEFAULT_CLASS_LESSON = LEARNING_CARD_CLASS_OPTIONS[0] ?? 'Class session';

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
  const { t, i18n } = useTranslation();

  const steps = useMemo(
    () =>
      [
        { id: 'input' as const, label: t('learningCard.wizard.stepClassInput') },
        { id: 'draft' as const, label: t('learningCard.wizard.stepGenerateReview') },
        { id: 'audience' as const, label: t('learningCard.wizard.stepAudience') },
      ] as const,
    [t],
  );
  const { currentUser } = useBridge();
  const classLesson = DEFAULT_CLASS_LESSON;
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
  /** LLM output per locale; teacher edits apply to `summary` (stored as `en` + `parentSummary`). */
  const [translatedDraft, setTranslatedDraft] = useState<LearningCardTranslatedSummaries | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  /** Generated student Knowledge (hero + body); read-only in review. */
  const [childKnowledgeDraft, setChildKnowledgeDraft] = useState<LearningCardChildKnowledge | null>(null);
  const [childKnowledgeError, setChildKnowledgeError] = useState<string | null>(null);
  /** Review step: parent-facing vs student-facing draft. */
  const [reviewTab, setReviewTab] = useState<'parent' | 'student'>('parent');
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

  const canSubmitInput =
    topic.trim().length > 0 && grade.trim().length > 0 && subject.trim().length > 0;

  async function confirmSendLearningCard() {
    const childKnowledge: LearningCardChildKnowledge | undefined =
      childKnowledgeDraft && childKnowledgeDraft.content.trim().length > 0
        ? { ...childKnowledgeDraft, content: childKnowledgeDraft.content.trim() }
        : undefined;

    const payload: LearningCardCreatePayload = {
      sentAt: Date.now(),
      classInput: {
        classLesson,
        grade,
        subject,
        topic: topic.trim(),
        notes: notes.trim(),
      },
      generated: {
        parentSummary: summary.trim(),
        ...(translatedDraft
          ? {
              translatedSummaries: {
                ...translatedDraft,
                en: summary.trim(),
              },
            }
          : {}),
        ...(childKnowledge ? { childKnowledge } : {}),
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
    setChildKnowledgeError(null);
    const genInput = {
      classTitle: classLesson,
      topic: topic.trim(),
      grade,
      subject,
      notes: notes.trim(),
    };
    try {
      async function generateChildSafe(): Promise<
        { ok: true; data: LearningCardChildKnowledge } | { ok: false; message: string }
      > {
        try {
          const api = getLlmApi();
          const [hero, body] = await Promise.all([
            api.generateChildKnowledgeHero(genInput),
            api.generateChildKnowledge(genInput),
          ]);
          const data: LearningCardChildKnowledge = { ...hero, ...body };
          return { ok: true, data };
        } catch (e) {
          return {
            ok: false,
            message: e instanceof Error ? e.message : t('learningCard.wizard.errors.childGenFailed'),
          };
        }
      }

      const [draft, childResult] = await Promise.all([
        getLlmApi().explainTerminologyToParents(genInput),
        generateChildSafe(),
      ]);
      const ts = draft.translatedSummaries;
      setTranslatedDraft(ts);
      setSummary(
        resolveParentSummaryForDisplay('', ts, uiLangFromI18n(i18n.language)),
      );
      setWarning(draft.warning ?? null);

      if (childResult.ok) {
        setChildKnowledgeDraft(childResult.data);
        setChildKnowledgeError(null);
      } else {
        setChildKnowledgeDraft(null);
        setChildKnowledgeError(childResult.message);
      }
      setReviewTab('parent');
      setPhase('review');
    } catch (e) {
      setWarning(e instanceof Error ? e.message : t('learningCard.wizard.errors.generationFailed'));
      setPhase('input');
    }
  };

  const sendLearningCard = async () => {
    const teacherSummary = summary.trim();
    const selectedActionCount = tonightActions.filter((action) => action.include).length;
    if (!teacherSummary || selectedActionCount === 0) {
      setSaveError(t('learningCard.wizard.errors.saveBeforeSend'));
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await confirmSendLearningCard();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('learningCard.wizard.errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const stepper = (
    <nav className="learning-card-steps" aria-label={t('learningCard.wizard.ariaStepper')}>
      <ol className="learning-card-steps__list">
        {steps.map((s, i) => {
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
          {t('learningCard.wizard.title')}
        </h3>
        <p className="modal__lede">{t('learningCard.wizard.lede')}</p>
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
              {/* <FieldSelect
                id="lc-class-lesson"
                label="Class / lesson title"
                value={classLesson}
                onValueChange={(v) => {
                  setClassLesson(v);
                  persistSelect(LS_KEY_CLASS, v);
                }}
                options={LEARNING_CARD_CLASS_OPTIONS}
              /> */}
              <FieldSelect
                id="lc-grade"
                label={t('learningCard.wizard.grade')}
                value={grade}
                onValueChange={(v) => {
                  setGrade(v);
                  persistSelect(LS_KEY_GRADE, v);
                }}
                options={LEARNING_CARD_GRADE_OPTIONS}
              />
              <FieldSelect
                id="lc-subject"
                label={t('learningCard.wizard.subject')}
                value={subject}
                onValueChange={(v) => {
                  setSubject(v);
                  persistSelect(LS_KEY_SUBJECT, v);
                }}
                options={LEARNING_CARD_SUBJECT_OPTIONS}
              />
            </div>
            <FieldTextInput
              id="lc-topic"
              label={t('learningCard.wizard.topic')}
              value={topic}
              onChange={setTopic}
              isRequired
              placeholder={t('learningCard.wizard.topicPlaceholder')}
            />
            <div className="learning-card-wizard-student-section">
              <p className="learning-card-wizard-student-section__heading">{t('learningCard.wizard.studentSectionTitle')}</p>
              <div
                className="learning-card-wizard-promo"
                role="region"
                aria-label={t('learningCard.wizard.studentPreviewAria')}
              >
                <div className="learning-card-wizard-promo__inner learning-card-wizard-promo__inner--text-only">
                  <div className="learning-card-wizard-promo__lead">
                    <span className="learning-card-wizard-promo__icon" aria-hidden>
                      <Sparkles strokeWidth={2} size={22} />
                    </span>
                    <div className="learning-card-wizard-promo__text">
                      <h4 className="learning-card-wizard-promo__title">{t('learningCard.wizard.studentPreviewTitle')}</h4>
                      <p className="learning-card-wizard-promo__body">{t('learningCard.wizard.studentPreviewBody')}</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="learning-card-wizard-student-section__parent-hint">{t('learningCard.wizard.studentPreviewParentHint')}</p>
            </div>
            <FieldTextArea
              id="lc-notes"
              label={t('learningCard.wizard.notes')}
              value={notes}
              onChange={setNotes}
              rows={3}
              placeholder={t('learningCard.wizard.notesPlaceholder')}
            />
          </div>
          <div className="modal__footer">
            <div className="modal__actions">
              <Button variant="text" type="button" onClick={onClose}>
                {t('learningCard.wizard.cancel')}
              </Button>
              <Button variant="primary" pill type="submit" disabled={!canSubmitInput}>
                {t('learningCard.wizard.generate')}
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
            <p className="learning-card-gen__title">{t('learningCard.wizard.generatingTitle')}</p>
            <p className="learning-card-gen__hint">{t('learningCard.wizard.generatingHint')}</p>
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
            <div className="learning-card-review-tabs">
              <div
                className="learning-card-review-tabs__bar learning-card-review-tabs__bar--pills"
                role="tablist"
                aria-label={t('learningCard.wizard.ariaReviewTabs')}
              >
                <button
                  type="button"
                  role="tab"
                  id="lc-tab-parent"
                  aria-selected={reviewTab === 'parent'}
                  aria-controls="lc-panel-parent"
                  tabIndex={reviewTab === 'parent' ? 0 : -1}
                  className={cx('learning-card-review-tabs__tab', reviewTab === 'parent' && 'is-active')}
                  onClick={() => setReviewTab('parent')}
                >
                  {t('learningCard.wizard.tabParents')}
                </button>
                <button
                  type="button"
                  role="tab"
                  id="lc-tab-student"
                  aria-selected={reviewTab === 'student'}
                  aria-controls="lc-panel-student"
                  tabIndex={reviewTab === 'student' ? 0 : -1}
                  className={cx('learning-card-review-tabs__tab', reviewTab === 'student' && 'is-active')}
                  onClick={() => setReviewTab('student')}
                >
                  {t('learningCard.wizard.tabStudents')}
                </button>
              </div>

              {reviewTab === 'parent' && (
                <div
                  id="lc-panel-parent"
                  role="tabpanel"
                  aria-labelledby="lc-tab-parent"
                  className="learning-card-review-tabs__panel learning-card-review-tabs__panel--parent"
                >
                  <LearningCardParentPanelTeacher
                    summary={summary}
                    onSummaryChange={setSummary}
                    warning={warning}
                    tonightActions={tonightActions}
                    onTonightIncludeChange={(preset, include) =>
                      setTonightActions((prev) =>
                        prev.map((x) => (x.preset === preset ? { ...x, include } : x)),
                      )
                    }
                    summaryKicker={t('learningCard.wizard.parentSummary')}
                    tonightKicker={t('learningCard.wizard.tonightActions')}
                    aiHintText={t('learningCard.wizard.aiHint')}
                    presetIncludeAriaLabel={(title) => t('learningCard.wizard.includePresetAria', { title })}
                  />
                </div>
              )}

              {reviewTab === 'student' && (
                <div
                  id="lc-panel-student"
                  role="tabpanel"
                  aria-labelledby="lc-tab-student"
                  className="learning-card-review-tabs__panel learning-card-review-tabs__panel--student"
                >
                  <div className="learning-card-review-summary learning-card-student-preview">
                    <p className="field__label learning-card-student-preview__kicker">
                      {t('learningCard.wizard.studentDiscovery')}
                    </p>
                    {childKnowledgeError && (
                      <p className="field__hint" role="alert">
                        {childKnowledgeError}
                        {t('learningCard.wizard.childErrorFollowUp')}
                      </p>
                    )}
                    {!childKnowledgeError && childKnowledgeDraft && childKnowledgeDraft.content.trim().length > 0 && (
                      <div className="learning-card-student-preview__body">
                        <div className="learning-card-student-preview__hero-wrap">
                          <img
                            className="knowledge-child-discovery__hero learning-card-student-preview__hero"
                            src={childKnowledgeDraft.heroImageUrl}
                            alt={childKnowledgeDraft.heroImageAlt ?? ''}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <Markdown className="learning-card-student-md">
                          {discoveryPlainTextToMarkdown(childKnowledgeDraft.content)}
                        </Markdown>
                      </div>
                    )}
                    {!childKnowledgeError &&
                      (!childKnowledgeDraft || !childKnowledgeDraft.content.trim()) && (
                      <p className="field__hint" role="status">
                        {t('learningCard.wizard.studentEmpty')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="modal__footer">
            <div className="modal__actions">
              <Button variant="text" type="button" onClick={() => setPhase('input')}>
                {t('learningCard.wizard.back')}
              </Button>
              <Button variant="primary" pill type="submit">
                {t('learningCard.wizard.continueAudience')}
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
              <Label className="field__label">{t('learningCard.wizard.whoReceives')}</Label>
              <div className="learning-card-audience-cards">
                <Radio value="class" className="learning-card-audience-card">
                  <span className="learning-card-audience-card__icon" aria-hidden="true">
                    <Users strokeWidth={1.75} size={28} />
                  </span>
                  <span className="learning-card-audience-card__body">
                    <strong className="learning-card-audience-card__title">
                      {t('learningCard.wizard.audienceWholeClass')}
                    </strong>
                    <span className="learning-card-audience-card__sub">
                      {t('learningCard.wizard.audienceWholeClassSub', { count: WHOLE_CLASS_RECIPIENTS })}
                    </span>
                  </span>
                </Radio>
                <Radio value="selected" className="learning-card-audience-card">
                  <span className="learning-card-audience-card__icon" aria-hidden="true">
                    <ListChecks strokeWidth={1.75} size={28} />
                  </span>
                  <span className="learning-card-audience-card__body">
                    <strong className="learning-card-audience-card__title">
                      {t('learningCard.wizard.audienceSelected')}
                    </strong>
                    <span className="learning-card-audience-card__sub">
                      {t('learningCard.wizard.audienceSelectedSub')}
                    </span>
                  </span>
                </Radio>
              </div>
            </RadioGroup>
            {audienceMode === 'selected' && (
              <fieldset className="field">
                <legend className="field__label">{t('learningCard.wizard.parentsLegend')}</legend>
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
                    {t('learningCard.wizard.selectOneParent')}
                  </p>
                )}
              </fieldset>
            )}
          </div>
          <div className="modal__footer">
            <div className="modal__actions">
              <Button variant="text" type="button" onClick={() => setPhase('review')}>
                {t('learningCard.wizard.back')}
              </Button>
              <Button
                variant="primary"
                pill
                type="submit"
                disabled={audienceMode === 'selected' && recipientCount === 0}
              >
                {t('learningCard.wizard.reviewSend')}
              </Button>
            </div>
          </div>
        </form>
      )}

      {phase === 'confirm' && (
        <div className="book-form learning-card-form">
          <div className="modal__scroll learning-card-main__scroll">
            <div className="learning-card-confirm">
              <div className="learning-card-confirm__lead-row">
                <span
                  className="learning-card-confirm__done-badge"
                  role="img"
                  aria-label={t('learningCard.wizard.confirmDoneBadgeTitle')}
                >
                  <Check className="learning-card-confirm__done-check" aria-hidden strokeWidth={3} size={14} />
                </span>
                <p className="learning-card-confirm__lead">{t('learningCard.wizard.confirmLead')}</p>
              </div>
              <div className="learning-card-confirm__highlight">
                <p className="learning-card-confirm__count">
                  {t('learningCard.wizard.confirmCount', {
                    count: recipientCount,
                    familyWord: t(
                      recipientCount === 1 ? 'learningCard.wizard.familyOne' : 'learningCard.wizard.familyOther',
                    ),
                  })}
                </p>
                <ul className="learning-card-confirm__bullets">
                  <li>
                    <span className="learning-card-confirm__bullet-label">{t('learningCard.wizard.bulletSummaryLabel')}</span>{' '}
                    <strong className="learning-card-confirm__bullet-value">
                      {summary.trim() ? t('learningCard.wizard.statusReady') : t('learningCard.wizard.statusDash')}
                    </strong>
                  </li>
                  <li>
                    <span className="learning-card-confirm__bullet-label">{t('learningCard.wizard.bulletStudentDiscoveryLabel')}</span>{' '}
                    <strong className="learning-card-confirm__bullet-value">
                      {childKnowledgeDraft?.content.trim()
                        ? t('learningCard.wizard.statusReady')
                        : t('learningCard.wizard.statusNotIncluded')}
                    </strong>
                  </li>
                  <li>
                    <span className="learning-card-confirm__bullet-label">{t('learningCard.wizard.bulletTonightActionsLabel')}</span>{' '}
                    <strong className="learning-card-confirm__bullet-value">
                      {tonightActions.filter((a) => a.include).length} / {LEARNING_CARD_TONIGHT_ACTION_PRESETS.length}
                    </strong>
                  </li>
                  <li>
                    <span className="learning-card-confirm__bullet-label">{t('learningCard.wizard.bulletAudienceLabel')}</span>{' '}
                    <strong className="learning-card-confirm__bullet-value">
                      {t(
                        audienceMode === 'class'
                          ? 'learningCard.wizard.audienceKindClass'
                          : 'learningCard.wizard.audienceKindSelected',
                      )}
                    </strong>
                  </li>
                </ul>
              </div>
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
                {t('learningCard.wizard.back')}
              </Button>
              <Button
                variant="primary"
                pill
                type="button"
                onClick={() => void sendLearningCard()}
                disabled={isSaving}
              >
                {isSaving ? t('learningCard.wizard.sending') : t('learningCard.wizard.send')}
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
