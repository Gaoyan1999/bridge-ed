import { useBridge } from '@/bridge/BridgeContext';
import { PARENT_DASH_CARDS, PARENT_DASH_MOOD, PARENT_DASH_SCHEDULE } from '@/bridge/mockData';
import { DashboardCard } from '@/bridge/components/DashboardCard';
import { LearningCardTile } from '@/bridge/components/LearningCardTile';
import { ScheduleWeek } from '@/bridge/components/ScheduleWeek';
import { cx } from '@/bridge/cx';

export function ParentDashboardPanel({ active, dashHint }: { active: boolean; dashHint: string }) {
  const { openCardThreadFromDashboard } = useBridge();

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
          Dashboard
        </h2>
        <p className="panel__hint">{dashHint}</p>
      </header>
      <div className="parent-dashboard-grid" id="parent-dashboard">
        <DashboardCard
          span={12}
          className="parent-card-section"
          id="parent-cards-title"
          title="Learning cards"
          titleColor="sky"
          subtitle="Short explanations of key concepts your child is learning."
          subtitleClassName="parent-cards__hint"
        >
          <div className="parent-cards-grid" id="parent-cards">
            {PARENT_DASH_CARDS.map((c) => (
              <LearningCardTile key={c.id} card={c} ctaLabel="Open in Messages" onOpen={openCardThreadFromDashboard} />
            ))}
          </div>
        </DashboardCard>

        <DashboardCard
          span={12}
          className="parent-schedule-section"
          id="parent-schedule-title"
          title="Your child’s schedule"
          titleColor="lavender"
        >
          <div className="schedule-week" id="parent-schedule">
            <ScheduleWeek days={PARENT_DASH_SCHEDULE} />
          </div>
        </DashboardCard>

        <DashboardCard
          span={12}
          className="parent-mood-section"
          id="parent-mood-title"
          title="Your child’s mood"
          titleColor="warm"
        >
          <div className="parent-mood-grid" id="parent-mood-grid">
            {PARENT_DASH_MOOD.map((m) => (
              <div key={m.day} className="parent-mood-day">
                <span className="parent-mood-day__date">{m.day}</span>
                <span className="parent-mood-day__emoji" aria-hidden="true">
                  {m.emoji}
                </span>
                <span className="parent-mood-day__label">{m.label}</span>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </section>
  );
}
