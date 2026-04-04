import { useTranslation } from 'react-i18next';
import type { LearningCardItem } from '@/bridge/types';

function formatCardLinkDate(at: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'numeric', day: 'numeric' }).format(
      new Date(at),
    );
  } catch {
    const d = new Date(at);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
    return `${weekdays[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
  }
}

interface LearningCardTileProps {
  card: LearningCardItem;
  /** Teacher dashboard: show `grade · subject`; parent: subject only. */
  subjectPillScope?: 'teacher' | 'parent';
  ctaLabel: string;
  onOpen: (card: LearningCardItem) => void;
  /** When `VITE_DEBUG` is on — show a delete control (wired by parent). */
  debugDelete?: boolean;
  onDebugDelete?: (card: LearningCardItem) => void | Promise<void>;
}

export function LearningCardTile({
  card,
  subjectPillScope = 'parent',
  ctaLabel,
  onOpen,
  debugDelete,
  onDebugDelete,
}: LearningCardTileProps) {
  const { t, i18n } = useTranslation();
  const showDelete = Boolean(debugDelete && onDebugDelete);
  const statusLabel = t(`learningCard.status.${card.status}`, { defaultValue: card.status });
  const linkDate = formatCardLinkDate(card.at, i18n.language);
  const subjectPillText =
    subjectPillScope === 'teacher' && card.grade.trim()
      ? [card.grade.trim(), card.subject.trim()].filter(Boolean).join(' · ')
      : card.subject.trim();

  return (
    <article className={showDelete ? 'parent-card parent-card--debug' : 'parent-card'} data-thread-id={card.threadId}>
      {showDelete && (
        <button
          type="button"
          className="parent-card__debug-delete"
          aria-label={t('learningCard.deleteAria', { title: card.title })}
          onClick={(e) => {
            e.stopPropagation();
            void onDebugDelete!(card);
          }}
        >
          {t('learningCard.delete')}
        </button>
      )}
      <button type="button" className="parent-card__main" onClick={() => onOpen(card)}>
        <h4 className="parent-card__title">{card.title}</h4>
        <div className="parent-card__meta">
          <span className="parent-card__subject-pill">{subjectPillText}</span>
          <span className="parent-card__status">{statusLabel}</span>
        </div>
        <p className="parent-card__summary">{card.summary}</p>
        <div className="parent-card__footer">
          <span className="parent-card__cta">{ctaLabel}</span>
          <span className="parent-card__linked">{t('learningCard.linkedTo', { date: linkDate })}</span>
        </div>
      </button>
    </article>
  );
}
