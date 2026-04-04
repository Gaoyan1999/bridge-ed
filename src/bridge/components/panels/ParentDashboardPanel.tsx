import { useCallback, useEffect, useState } from 'react';
import { useBridge } from '@/bridge/BridgeContext';
import type { LearningCardItem } from '@/bridge/types';
import { PARENT_DASH_MOOD, PARENT_DASH_SCHEDULE } from '@/bridge/mockData';
import { getDataLayer, getDataSourceMode, getDebugMode } from '@/data';
import { learningCardBackendToItem } from '@/data/learning-card-mappers';
import { DashboardCard } from '@/bridge/components/DashboardCard';
import { DashboardShell } from '@/bridge/components/DashboardShell';
import { LearningCardTile } from '@/bridge/components/LearningCardTile';
import { ScheduleWeek } from '@/bridge/components/ScheduleWeek';

export function ParentDashboardPanel({ active, dashHint }: { active: boolean; dashHint: string }) {
  const { openCardThreadFromDashboard, learningCardsEpoch, bumpLearningCards } = useBridge();
  const [cards, setCards] = useState<LearningCardItem[]>([]);
  const dataSourceMode = getDataSourceMode();
  const debugMode = getDebugMode();

  const onDebugDeleteLearningCard = useCallback(
    async (card: LearningCardItem) => {
      if (!window.confirm(`Delete “${card.title}”?`)) return;
      try {
        await getDataLayer().learningCards.delete(card.id);
        bumpLearningCards();
      } catch (e) {
        console.error('[LearningCard] delete failed', e);
      }
    },
    [bumpLearningCards],
  );

  useEffect(() => {
    let cancelled = false;
    void getDataLayer()
      .learningCards.listByUserId('local')
      .then((rows) => {
        if (!cancelled) setCards(rows.map(learningCardBackendToItem));
      })
      .catch(() => {
        if (!cancelled) setCards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [learningCardsEpoch]);

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
        {cards.length === 0 ? (
          <p className="parent-cards__hint" style={{ gridColumn: '1 / -1' }}>
            {dataSourceMode === 'api'
              ? 'No cards from API. Set VITE_DATA_SOURCE=indexeddb in .env for local Dexie storage, or implement GET /learning-cards.'
              : 'No learning cards yet. Switch to the teacher role and create one — it is stored in this browser (IndexedDB).'}
          </p>
        ) : (
          cards.map((c) => (
            <LearningCardTile
              key={c.id}
              card={c}
              ctaLabel="Open in Messages"
              onOpen={openCardThreadFromDashboard}
              debugDelete={debugMode}
              onDebugDelete={debugMode ? onDebugDeleteLearningCard : undefined}
            />
          ))
        )}
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
