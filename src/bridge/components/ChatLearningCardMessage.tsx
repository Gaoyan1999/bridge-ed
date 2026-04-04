import { useTranslation } from 'react-i18next';
import type { LearningCardItem } from '@/bridge/types';
import { resolveParentSummaryFromLearningCardItem } from '@/data';

/** Inline learning-card preview inside a chat bubble (Messages thread). */
export function ChatLearningCardMessage({ card }: { card: LearningCardItem }) {
  const { t } = useTranslation();
  const summary = resolveParentSummaryFromLearningCardItem(card);
  const statusLabel = t(`learningCard.status.${card.status}`, { defaultValue: card.status });

  return (
    <article className="learning-card learning-card--inline-msg">
      <h4 className="learning-card__title">{card.title}</h4>
      <div className="learning-card__meta learning-card__meta--row">
        <span>{card.subject.trim() || '—'}</span>
        <span className="learning-card__status-pill">{statusLabel}</span>
      </div>
      <p className="learning-card__summary">{summary}</p>
    </article>
  );
}
