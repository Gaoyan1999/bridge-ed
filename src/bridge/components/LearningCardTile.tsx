import type { LearningCardItem } from '@/bridge/types';

function formatLinkedDay(at: number): string {
  const d = new Date(at);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
  return `${weekdays[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

interface LearningCardTileProps {
  card: LearningCardItem;
  ctaLabel: string;
  onOpen: (card: LearningCardItem) => void;
  /** When `VITE_DEBUG` is on — show a delete control (wired by parent). */
  debugDelete?: boolean;
  onDebugDelete?: (card: LearningCardItem) => void | Promise<void>;
}

export function LearningCardTile({
  card,
  ctaLabel,
  onOpen,
  debugDelete,
  onDebugDelete,
}: LearningCardTileProps) {
  const showDelete = Boolean(debugDelete && onDebugDelete);

  return (
    <article className={showDelete ? 'parent-card parent-card--debug' : 'parent-card'} data-thread-id={card.threadId}>
      {showDelete && (
        <button
          type="button"
          className="parent-card__debug-delete"
          aria-label={`Delete learning card: ${card.title}`}
          onClick={(e) => {
            e.stopPropagation();
            void onDebugDelete!(card);
          }}
        >
          Delete
        </button>
      )}
      <button type="button" className="parent-card__main" onClick={() => onOpen(card)}>
        <h4 className="parent-card__title">{card.title}</h4>
        <div className="parent-card__meta">
          <span className="parent-card__subject-pill">{card.subject}</span>
          <span className="parent-card__status">{card.status}</span>
        </div>
        <p className="parent-card__summary">{card.summary}</p>
        <div className="parent-card__footer">
          <span className="parent-card__cta">{ctaLabel}</span>
          <span className="parent-card__linked">Linked to {formatLinkedDay(card.at)}</span>
        </div>
      </button>
    </article>
  );
}
