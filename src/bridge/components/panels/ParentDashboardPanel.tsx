import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBridge } from '@/bridge/BridgeContext';
import type { LearningCardItem } from '@/bridge/types';
import { DEMO_PARENT_USER_ID, PARENT_DASH_SCHEDULE } from '@/bridge/mockData';
import { getDataLayer, getDebugMode } from '@/data';
import { parentMoodChildrenFromUsers } from '@/data/parent-mood-children';
import type { StudentMoodBackend } from '@/data/entity/student-mood-backend';
import type { ParentMoodChildProfile } from '@/bridge/types';
import { learningCardBackendToItem } from '@/data/learning-card-mappers';
import { getCurrentWeekLocalDateRange } from '@/bridge/moodWeek';
import { DashboardCard } from '@/bridge/components/DashboardCard';
import { DashboardShell } from '@/bridge/components/DashboardShell';
import { LearningCardTile } from '@/bridge/components/LearningCardTile';
import { ParentMoodWeek } from '@/bridge/components/ParentMoodWeek';
import { ScheduleWeek } from '@/bridge/components/ScheduleWeek';

export function ParentDashboardPanel({ active, dashHint }: { active: boolean; dashHint: string }) {
  const { t } = useTranslation();
  const { openKnowledgeFromCard, learningCardsEpoch, bumpLearningCards, studentMoodsEpoch, currentUser } =
    useBridge();
  const parentUserId = currentUser?.role === 'parent' ? currentUser.id : DEMO_PARENT_USER_ID;
  const [cards, setCards] = useState<LearningCardItem[]>([]);
  const [moodEntries, setMoodEntries] = useState<StudentMoodBackend[]>([]);
  const [moodChildren, setMoodChildren] = useState<ParentMoodChildProfile[]>([]);
  const debugMode = getDebugMode();

  const onDebugDeleteLearningCard = useCallback(
    async (card: LearningCardItem) => {
      if (!window.confirm(t('learningCard.deleteConfirm', { title: card.title }))) return;
      try {
        await getDataLayer().learningCards.delete(card.id);
        bumpLearningCards();
      } catch (e) {
        console.error('[LearningCard] delete failed', e);
      }
    },
    [bumpLearningCards, t],
  );

  useEffect(() => {
    let cancelled = false;
    void getDataLayer()
      .learningCards.listForParentUser(parentUserId)
      .then((rows) => {
        if (!cancelled) setCards(rows.map(learningCardBackendToItem));
      })
      .catch(() => {
        if (!cancelled) setCards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [learningCardsEpoch, parentUserId]);

  useEffect(() => {
    let cancelled = false;
    const { start, end } = getCurrentWeekLocalDateRange();
    const layer = getDataLayer();
    void Promise.all([layer.users.list(), layer.studentMoods.getChildrenMood(parentUserId)])
      .then(([users, rows]) => {
        if (cancelled) return;
        setMoodChildren(parentMoodChildrenFromUsers(users, parentUserId));
        setMoodEntries(rows.filter((r) => r.localDate >= start && r.localDate <= end));
      })
      .catch(() => {
        if (!cancelled) {
          setMoodChildren([]);
          setMoodEntries([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [studentMoodsEpoch, parentUserId]);

  const sections = [
    <DashboardCard
      key="cards"
      span={12}
      className="parent-card-section"
      id="parent-cards-title"
      title={t('dashboard.parent.cardsTitle')}
      titleColor="sky"
      subtitle={t('dashboard.parent.cardsSubtitle')}
      subtitleClassName="parent-cards__hint"
    >
      <div className="parent-cards-grid" id="parent-cards">
        {cards.length === 0 ? (
          <p className="parent-cards__hint" style={{ gridColumn: '1 / -1' }}>
            {t('dashboard.parent.noCards')}
          </p>
        ) : (
          cards.map((c) => (
            <LearningCardTile
              key={c.id}
              card={c}
              ctaLabel={t('dashboard.parent.ctaOpenKnowledge')}
              onOpen={openKnowledgeFromCard}
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
      title={t('dashboard.parent.scheduleTitle')}
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
      title={t('dashboard.parent.moodTitle')}
      titleColor="warm"
    >
      {moodChildren.length === 0 ? (
        <p className="parent-cards__hint" id="parent-mood-empty">
          {t('dashboard.parent.moodEmpty')}
        </p>
      ) : (
        <ParentMoodWeek childrenProfiles={moodChildren} entries={moodEntries} />
      )}
    </DashboardCard>,
  ];

  return <DashboardShell active={active} dashHint={dashHint} gridId="parent-dashboard" sections={sections} />;
}
