import type { ReactNode } from 'react';
import { cx } from '@/bridge/cx';

const TITLE_COLOR_CLASS = {
  sky: 'dash-card__title--sky',
  warm: 'dash-card__title--warm',
  lavender: 'dash-card__title--lavender',
  default: '',
} as const;

export type DashboardCardTitleColor = keyof typeof TITLE_COLOR_CLASS;

export type DashboardCardProps = {
  /**
   * How many columns (of 12) this card spans. Tailwind-style widths map as:
   * 12 → full row, 6 → half (w-1/2), 4 → third (w-1/3), 3 → quarter (w-1/4), etc.
   */
  span?: number;
  title: string;
  titleColor?: DashboardCardTitleColor;
  /** `id` on the title heading; also used for `aria-labelledby` on the section */
  id?: string;
  className?: string;
  /** Gradient banner background (e.g. class report) */
  banner?: boolean;
  /** Optional copy under the title */
  subtitle?: ReactNode;
  /** Class for the subtitle paragraph (default `dash-card__sub`) */
  subtitleClassName?: string;
  /** Actions or controls aligned with the header (buttons, search, etc.) */
  headerActions?: ReactNode;
  children?: ReactNode;
};

export function DashboardCard({
  span = 12,
  title,
  titleColor = 'default',
  id,
  className,
  banner = false,
  subtitle,
  subtitleClassName,
  headerActions,
  children,
}: DashboardCardProps) {
  const cols = Math.min(12, Math.max(1, span));
  const titleId = id ?? `dash-card-title-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const titleClassName = cx('dash-card__title', TITLE_COLOR_CLASS[titleColor]);
  const subClass = subtitleClassName ?? 'dash-card__sub';

  const reportHeader = Boolean(subtitle && headerActions);
  const stackedSubtitleOnly = Boolean(subtitle && !headerActions);
  const actionsOnlyHeader = Boolean(!subtitle && headerActions);

  let header: ReactNode;
  if (reportHeader) {
    header = (
      <div className="dash-card__head dash-card__head--report">
        <div>
          <h3 className={titleClassName} id={titleId}>
            {title}
          </h3>
          <p className="dash-card__sub">{subtitle}</p>
        </div>
        {headerActions}
      </div>
    );
  } else if (stackedSubtitleOnly) {
    header = (
      <div className="dash-card__head">
        <div>
          <h3 className={titleClassName} id={titleId}>
            {title}
          </h3>
          <p className={cx(subClass)}>{subtitle}</p>
        </div>
      </div>
    );
  } else if (actionsOnlyHeader) {
    header = (
      <div className="dash-card__head">
        <h3 className={titleClassName} id={titleId}>
          {title}
        </h3>
        {headerActions}
      </div>
    );
  } else {
    header = (
      <h3 className={titleClassName} id={titleId}>
        {title}
      </h3>
    );
  }

  return (
    <section
      className={cx('dash-card', 'dash-card--surface', banner && 'dash-card--banner', className)}
      aria-labelledby={titleId}
      style={{ gridColumn: `span ${cols} / span ${cols}` }}
    >
      {header}
      {children}
    </section>
  );
}
