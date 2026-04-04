import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cx } from '@/bridge/cx';

export type DashboardShellProps = {
  active: boolean;
  dashHint: string;
  /** Cards / blocks rendered inside `.dashboard-grid` (same layout for every role). */
  sections: ReactNode[];
  /** `id` on the grid container (tests / deep links). */
  gridId?: string;
};

export function DashboardShell({ active, dashHint, sections, gridId = 'dashboard-grid' }: DashboardShellProps) {
  const { t } = useTranslation();
  return (
    <section
      className={cx('panel', 'panel--dashboard', active && 'is-visible')}
      id="panel-dashboard"
      data-panel="dashboard"
      role="region"
      aria-labelledby="panel-dashboard-title"
      hidden={!active}
    >
      <header className="panel__header">
        <h2 className="panel__title" id="panel-dashboard-title">
          {t('panels.dashboard')}
        </h2>
        <p className="panel__hint">{dashHint}</p>
      </header>
      <div className="dashboard-grid" id={gridId}>
        {sections.map((section, i) => (
          <Fragment key={i}>{section}</Fragment>
        ))}
      </div>
    </section>
  );
}
