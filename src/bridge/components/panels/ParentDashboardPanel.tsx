import { useBridge } from '@/bridge/BridgeContext';
import { PARENT_DASH_CARDS, PARENT_DASH_MOOD, PARENT_DASH_SCHEDULE } from '@/bridge/mockData';
import { DashboardCard } from '@/bridge/components/DashboardCard';
import { DashboardShell } from '@/bridge/components/DashboardShell';
import { LearningCardTile } from '@/bridge/components/LearningCardTile';
import { ScheduleWeek } from '@/bridge/components/ScheduleWeek';

export function ParentDashboardPanel({ active, dashHint }: { active: boolean; dashHint: string }) {
  const { openCardThreadFromDashboard } = useBridge();

  const sections = [
    <DashboardCard
      key="cards"
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
    </DashboardCard>,

    <DashboardCard
      key="schedule"
      span={12}
      className="parent-schedule-section"
      id="parent-schedule-title"
      title="Your child’s schedule"
      titleColor="lavender"
    >
      <div className="schedule-week" id="parent-schedule">
        <ScheduleWeek days={PARENT_DASH_SCHEDULE} />
      </div>
    </DashboardCard>,

    <DashboardCard
      key="mood"
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
    </DashboardCard>,
  ];

  return <DashboardShell active={active} dashHint={dashHint} gridId="parent-dashboard" sections={sections} />;
}
