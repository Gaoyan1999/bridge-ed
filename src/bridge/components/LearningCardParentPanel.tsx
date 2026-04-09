import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Checkbox } from 'react-aria-components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Markdown } from '@/bridge/components/Markdown';
import { Button } from '@/bridge/components/ui/Button';
import { FieldTextArea } from '@/bridge/components/ui/FieldTextArea';
import { cx } from '@/bridge/cx';
import type { LearningCardTonightAction, LearningCardTonightActionPreset } from '@/bridge/types';

/** Teacher wizard: editable summary + checkbox tonight actions (same layout as parent preview). */
export function LearningCardParentPanelTeacher({
  summary,
  onSummaryChange,
  warning,
  tonightActions,
  onTonightIncludeChange,
  summaryKicker,
  tonightKicker,
  aiHintText,
  tonightHeadingId = 'lc-tonight-heading',
  presetIncludeAriaLabel,
}: {
  summary: string;
  onSummaryChange: (v: string) => void;
  warning?: string | null;
  tonightActions: LearningCardTonightAction[];
  onTonightIncludeChange: (preset: LearningCardTonightActionPreset, include: boolean) => void;
  summaryKicker: string;
  tonightKicker: string;
  aiHintText: string;
  tonightHeadingId?: string;
  presetIncludeAriaLabel: (title: string) => string;
}) {
  const { t } = useTranslation();
  return (
    <div className="learning-card-parent-panel">
      <div className="learning-card-review-summary">
        <p className="field__label">{summaryKicker}</p>
        {warning ? (
          <p className="field__hint" role="status">
            {warning}
          </p>
        ) : null}
        <div className="learning-card-ai-hint" role="note">
          <div className="learning-card-ai-hint__icon-wrap" aria-hidden="true">
            <Sparkles className="learning-card-ai-hint__icon" strokeWidth={2} size={14} />
          </div>
          <p className="learning-card-ai-hint__text">{aiHintText}</p>
        </div>
        <FieldTextArea
          id="lc-summary"
          label={summaryKicker}
          labelHidden
          value={summary}
          onChange={onSummaryChange}
          rows={4}
        />
      </div>
      <fieldset
        className="field field--actions-pick field--actions-pick--grouped"
        aria-labelledby={tonightHeadingId}
      >
        <p id={tonightHeadingId} className="learning-card-actions-section__kicker">
          {tonightKicker}
        </p>
        <div className="learning-card-actions-group">
          <ul className="learning-card-actions learning-card-actions--presets">
            {tonightActions.map((row, idx) => {
              const title = t(`learningCard.wizard.tonightPreset.${row.preset}.title`);
              const description = t(`learningCard.wizard.tonightPreset.${row.preset}.description`);
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
                    onChange={(v) => onTonightIncludeChange(row.preset, v)}
                    className="learning-card-actions__check learning-card-checkbox learning-card-checkbox--round"
                    aria-label={presetIncludeAriaLabel(title)}
                  />
                  <div className="learning-card-actions__preset-body">
                    <span className="learning-card-actions__preset-title">{title}</span>
                    <span className="learning-card-actions__preset-desc">{description}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </fieldset>
    </div>
  );
}

function hasDisplayableSummary(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && t !== '-';
}

/** Parent Knowledge: read-only summary + teacher-included actions; tap row to toggle done (strikethrough). */
export function LearningCardParentKnowledgeView({
  summaryText,
  tonightActionsIncluded,
  tonightActionsDone,
  onToggleTonightDone,
  tonightKicker,
  bridgedAiLabel,
  expandLabel,
  collapseLabel,
  tonightHeadingId = 'knowledge-parent-tonight-heading',
}: {
  summaryText: string;
  tonightActionsIncluded: LearningCardTonightAction[];
  tonightActionsDone: LearningCardTonightActionPreset[] | undefined;
  onToggleTonightDone: (preset: LearningCardTonightActionPreset) => void;
  tonightKicker: string;
  bridgedAiLabel: string;
  expandLabel: string;
  collapseLabel: string;
  tonightHeadingId?: string;
}) {
  const { t } = useTranslation();
  const doneSet = new Set(tonightActionsDone ?? []);
  const showSummary = hasDisplayableSummary(summaryText);
  const showTonight = tonightActionsIncluded.length > 0;
  if (!showSummary && !showTonight) return null;
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="knowledge-parent-lc-preview">
      <div className="learning-card-parent-panel">
        <div className="knowledge-parent-preview-toggle-wrap">
          <Button
            variant="text"
            sm
            className="knowledge-parent-preview-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls="knowledge-parent-preview-content"
          >
            {expanded ? (
              <>
                <ChevronUp strokeWidth={2.2} size={18} aria-hidden />
                {collapseLabel}
              </>
            ) : (
              <>
                <ChevronDown strokeWidth={2.2} size={18} aria-hidden />
                {expandLabel}
              </>
            )}
          </Button>
        </div>
        <div id="knowledge-parent-preview-content" hidden={!expanded}>
          {showSummary ? (
            <div className="learning-card-review-summary">
              <p className="knowledge-parent-summary__source">{bridgedAiLabel}</p>
              <div className="learning-card-parent-summary-markdown field__input field__input--pill">
                <Markdown className="knowledge-parent-summary-md">{summaryText.trim()}</Markdown>
              </div>
            </div>
          ) : null}
          {showTonight ? (
            <div
              className="field field--actions-pick field--actions-pick--grouped"
              role="group"
              aria-labelledby={tonightHeadingId}
            >
              <p id={tonightHeadingId} className="learning-card-actions-section__kicker">
                {tonightKicker}
              </p>
              <div className="learning-card-actions-group">
                <ul className="learning-card-actions learning-card-actions--presets">
                  {tonightActionsIncluded.map((row, idx) => {
                    const title = t(`learningCard.wizard.tonightPreset.${row.preset}.title`);
                    const description = t(`learningCard.wizard.tonightPreset.${row.preset}.description`);
                    const isLast = idx === tonightActionsIncluded.length - 1;
                    const done = doneSet.has(row.preset);
                    return (
                      <li
                        key={row.preset}
                        className={cx(
                          'learning-card-actions__row',
                          'learning-card-actions__row--preset',
                          'learning-card-actions__row--parent-track',
                          isLast && 'learning-card-actions__row--last',
                        )}
                      >
                        <button
                          type="button"
                          className={cx(
                            'learning-card-actions__parent-row-btn',
                            done && 'learning-card-actions__parent-row-btn--done',
                          )}
                          aria-pressed={done}
                          aria-label={title}
                          onClick={() => onToggleTonightDone(row.preset)}
                        >
                          <span
                            className="learning-card-actions__check learning-card-checkbox learning-card-checkbox--round"
                            data-selected={done ? true : undefined}
                            aria-hidden
                          />
                          <span className="learning-card-actions__preset-body">
                            <span className="learning-card-actions__preset-title">{title}</span>
                            <span className="learning-card-actions__preset-desc">{description}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
