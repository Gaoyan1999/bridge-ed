import { formatLearningCardLinkedDay } from '@/bridge/learningCardDates';
import type { LearningCardItem } from '@/bridge/types';

interface LearningCardTileProps {
  card: LearningCardItem;
  ctaLabel: string;
  onOpen: (card: LearningCardItem) => void;
}

export function LearningCardTile({ card, ctaLabel, onOpen }: LearningCardTileProps) {
  return (
    <button
      type="button"
      className="parent-card"
      data-thread-id={card.threadId}
      onClick={() => onOpen(card)}
    >
      <h4 className="parent-card__title">{card.title}</h4>
      <div className="parent-card__meta">
        <span className="parent-card__subject-pill">{card.subject}</span>
        <span className="parent-card__status">{card.status}</span>
      </div>
      <p className="parent-card__summary">{card.summary}</p>
      <div className="parent-card__footer">
        <span className="parent-card__cta">{ctaLabel}</span>
        <span className="parent-card__linked">{formatLearningCardLinkedDay(card.at)}</span>
      </div>
    </button>
  );
}
