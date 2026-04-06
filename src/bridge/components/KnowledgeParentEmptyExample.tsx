import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ListChecks } from 'lucide-react';
import { Markdown } from '@/bridge/components/Markdown';
import { Button } from '@/bridge/components/ui/Button';
import {
  LEARNING_CARD_TONIGHT_PRESET_LABELS,
  isParentFacingTonightPreset,
  type LearningCardItem,
  type LearningCardTonightActionPreset,
} from '@/bridge/types';
import { normalizeTonightActions } from '@/data/learning-card-mappers';

/**
 * Static example card — same shape as `learningCardBackendToItem` output, for empty-state onboarding.
 */
const EXAMPLE_CARD: LearningCardItem = {
  id: 'example-knowledge-card',
  threadId: 'example-thread-knowledge',
  title: '勾股定理',
  grade: 'G9',
  subject: 'G9 · Math',
  summary:
    'Tonight: review how factoring ties to area models, then try two textbook-style problems with your child.',
  at: Date.now(),
  tonightActions: normalizeTonightActions([
    { preset: 'quiz', include: true, text: '' },
    { preset: 'parent_led_practice', include: true, text: '' },
    { preset: 'explain_to_parent', include: true, text: '' },
  ]),
};

const EXAMPLE_AI_INTRO =
  'Here’s a quick angle for **tonight’s practice**: ask your child to explain why the theorem only applies to **right** triangles, then sketch one 3–4–5 triangle together.';

/**
 * Shown inside parent Knowledge when there are no learning cards yet — previews layout and interactions (example only).
 */
function exampleTonightActionLabel(preset: LearningCardTonightActionPreset, t: (k: string) => string): string {
  if (preset === 'parent_led_practice') return t('knowledge.practice.button');
  return t(`knowledge.taskShort.${preset}`);
}

export function KnowledgeParentEmptyExample() {
  const { t } = useTranslation();
  const [completionDone, setCompletionDone] = useState(false);
  const card = EXAMPLE_CARD;
  const includedSteps = card.tonightActions.filter((a) => a.include && isParentFacingTonightPreset(a.preset));

  return (
    <>
      <div className="inbox" id="knowledge-inbox-example" aria-label="Example learning card">
        <div className="panel__hint knowledge-parent-example__banner" role="note">
          Example — when your teacher sends a card, it will appear in this list. This is a preview only.
        </div>
        <button type="button" className="inbox-item inbox-item--knowledge is-active" disabled tabIndex={-1}>
          <div className="inbox-item__title">{card.title}</div>
          <div className="knowledge-inbox__labels" role="group" aria-label="Subject">
            <span className="knowledge-inbox__label knowledge-inbox__label--subject">Math</span>
          </div>
          <div className="inbox-item__meta">{new Date(card.at).toISOString().slice(0, 10)}</div>
        </button>
      </div>

      <div className="thread-pane">
        <div className="thread-header thread-header--knowledge">
          <div className="thread-header__main">
            <h3 className="thread-title" id="knowledge-thread-title-example">
              {card.title}
            </h3>
            <div className="thread-header__knowledge-toolbar">
              <div className="thread-header__knowledge-left">
                <div className="knowledge-inbox__labels" role="group" aria-label="Subject">
                  <span className="knowledge-inbox__label knowledge-inbox__label--subject">Math</span>
                </div>
              </div>
              {includedSteps.length > 0 ? (
                <div
                  className="thread-header__knowledge-right knowledge-tonight-actions"
                  role="group"
                  aria-label={t('knowledge.ariaSuggestedTasks')}
                >
                  {includedSteps.map((a) => (
                    <Button
                      key={a.preset}
                      type="button"
                      variant="secondary"
                      pill
                      className="btn--sm knowledge-tonight-actions__btn"
                      disabled
                      title={LEARNING_CARD_TONIGHT_PRESET_LABELS[a.preset].title}
                    >
                      {exampleTonightActionLabel(a.preset, t)}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="knowledge-lc-detail">
          <section className="knowledge-lc-detail__block" aria-labelledby="knowledge-steps-heading-example">
            <h4 id="knowledge-steps-heading-example" className="knowledge-lc-detail__title">
              <ListChecks className="knowledge-lc-detail__title-icon" strokeWidth={2} size={16} aria-hidden />
              Steps to mastery
            </h4>
            <ul className="knowledge-lc-detail__steps">
              {includedSteps.map((action) => {
                const copy = LEARNING_CARD_TONIGHT_PRESET_LABELS[action.preset];
                return (
                  <li key={action.preset} className="knowledge-lc-detail__step">
                    <span className="knowledge-lc-detail__step-title">{copy.title}</span>
                    <span className="knowledge-lc-detail__step-desc">{copy.description}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="knowledge-lc-detail__block" aria-labelledby="knowledge-status-heading-example">
            <h4 id="knowledge-status-heading-example" className="knowledge-lc-detail__status-heading">
              Status
            </h4>
            <button
              type="button"
              className="knowledge-lc-completion"
              aria-pressed={completionDone}
              onClick={() => setCompletionDone((v) => !v)}
            >
              <span
                className="knowledge-lc-completion__circle"
                data-done={completionDone ? 'true' : undefined}
                aria-hidden
              >
                {completionDone ? <Check className="knowledge-lc-completion__check" strokeWidth={3} size={14} /> : null}
              </span>
              <span className="knowledge-lc-completion__label">Done</span>
            </button>
          </section>
        </div>

        <div className="msg-thread" id="knowledge-msg-thread-example">
          <div className="msg msg--in">
            <div className="msg__who">BridgeEd AI</div>
            <Markdown className="markdown-content--msg-in">{EXAMPLE_AI_INTRO}</Markdown>
          </div>
        </div>

        <div className="knowledge-parent-example__composer-note">
          <span className="knowledge-parent-example__composer-note-inner">
            When you have a real card, you can ask questions about it here.
          </span>
        </div>
      </div>
    </>
  );
}
