import { useCallback, useEffect, useState } from 'react';
import { useBridge } from '@/bridge/BridgeContext';
import type { LearningCardItem } from '@/bridge/types';
import { DASH_PUBLISH, DASH_SCHEDULE, DASH_STATS, DASH_STUDENTS, DASH_TODOS } from '@/bridge/mockData';
import { getDataLayer, getDebugMode } from '@/data';
import { learningCardBackendToItem } from '@/data/learning-card-mappers';
import { DashboardCard } from '@/bridge/components/DashboardCard';
import { DashboardShell } from '@/bridge/components/DashboardShell';
import { LearningCardTile } from '@/bridge/components/LearningCardTile';
import { ScheduleWeek } from '@/bridge/components/ScheduleWeek';
import { Button } from '@/bridge/components/ui/Button';

export function TeacherDashboardPanel({ active, dashHint }: { active: boolean; dashHint: string }) {
  const { openCardThreadFromDashboard, showGeneric, openModal, learningCardsEpoch, bumpLearningCards } = useBridge();
  const [studentFilter, setStudentFilter] = useState('');
  const [learningCards, setLearningCards] = useState<LearningCardItem[]>([]);
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
        if (!cancelled) setLearningCards(rows.map(learningCardBackendToItem));
      })
      .catch(() => {
        if (!cancelled) setLearningCards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [learningCardsEpoch]);

  const q = studentFilter.trim().toLowerCase();
  const filteredStudents = !q
    ? DASH_STUDENTS
    : DASH_STUDENTS.filter((s) => s.name.toLowerCase().includes(q));

  const sections = [
    <DashboardCard
      key="report"
      span={12}
      id="dash-report-title"
      title="Class report"
      titleColor="sky"
      banner
      subtitle={
        <>
          Write or generate a short report, then push it to <strong>students</strong>, <strong>parents</strong>, or
          both.
        </>
      }
      headerActions={
        <Button variant="primary" pill id="btn-open-report-modal" onClick={() => openModal({ type: 'report' })}>
          Create report
        </Button>
      }
    />,

    <DashboardCard
      key="cards"
      span={12}
      className="teacher-card-section"
      id="teacher-cards-title"
      title="Learning cards"
      titleColor="sky"
      subtitle="Concept cards for families: definitions, materials, and a simple plan."
      headerActions={
        <Button
          variant="secondary"
          pill
          id="btn-teacher-create-card"
          onClick={() => openModal({ type: 'learningCard' })}
        >
          Create card
        </Button>
      }
    >
      <div className="parent-cards-grid mt-2" id="teacher-cards">
        {learningCards.length === 0 ? (
          <p className="parent-cards__hint" style={{ gridColumn: '1 / -1' }}>
            No learning cards yet. Use Create card to add one.
          </p>
        ) : (
          learningCards.map((c) => (
            <LearningCardTile
              key={c.id}
              card={c}
              ctaLabel="Open parent view"
              onOpen={openCardThreadFromDashboard}
              debugDelete={debugMode}
              onDebugDelete={debugMode ? onDebugDeleteLearningCard : undefined}
            />
          ))
        )}
      </div>
    </DashboardCard>,

    <DashboardCard key="todo" span={6} id="dash-todo-title" title="Today" titleColor="warm">
      <ul className="todo-list" id="dash-todo-list">
        {DASH_TODOS.map((t) => {
          const id = `todo-${t.id}`;
          return (
            <li key={t.id}>
              <input type="checkbox" id={id} checked={t.done} readOnly disabled />
              <label htmlFor={id}>{t.text}</label>
            </li>
          );
        })}
      </ul>
    </DashboardCard>,

    <DashboardCard key="publish" span={6} id="dash-publish-title" title="Recent posts" titleColor="lavender">
      <ul className="publish-list" id="dash-publish-list">
        {DASH_PUBLISH.map((p) => (
          <li key={p.title}>
            <strong>{p.title}</strong>
            <span>
              {p.date} · {p.meta}
            </span>
          </li>
        ))}
      </ul>
      <Button
        variant="link"
        className="btn--sm dash-card__cta"
        id="btn-new-learning-card"
        onClick={() => openModal({ type: 'learningCard' })}
      >
        + New learning card
      </Button>
    </DashboardCard>,

    <DashboardCard key="stats" span={12} id="dash-stats-title" title="Class pulse" titleColor="sky">
      <div className="stat-row" id="dash-stats">
        {DASH_STATS.map((s) => (
          <div key={s.label} className="stat-pill">
            <div className="stat-pill__value">{s.value}</div>
            <div className="stat-pill__label">{s.label}</div>
          </div>
        ))}
      </div>
    </DashboardCard>,

    <DashboardCard
      key="students"
      span={12}
      id="dash-students-title"
      title="Student directory"
      headerActions={
        <input
          type="search"
          className="field__input field__input--inline field__input--pill"
          id="student-filter"
          placeholder="Filter by name…"
          aria-label="Filter students"
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
        />
      }
    >
      <div className="table-wrap table-wrap--flush">
        <table className="data-table data-table--compact" id="dash-students-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Grade</th>
              <th>Parent</th>
              <th>Last note</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="dash-students-body">
            {filteredStudents.map((s) => (
              <tr key={s.name} data-name={s.name.toLowerCase()} hidden={false}>
                <td>{s.name}</td>
                <td>{s.grade}</td>
                <td>{s.parent}</td>
                <td>{s.feedback}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn--text btn--sm dash-row-action"
                    onClick={() =>
                      showGeneric(
                        'Student detail',
                        'Demo: contact info, past learning-card feedback, and booking history would appear here.',
                      )
                    }
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>,

    <DashboardCard key="schedule" span={12} id="dash-schedule-title" title="This week" titleColor="warm">
      <div className="schedule-week" id="dash-schedule">
        <ScheduleWeek days={DASH_SCHEDULE} />
      </div>
    </DashboardCard>,
  ];

  return <DashboardShell active={active} dashHint={dashHint} gridId="teacher-dashboard" sections={sections} />;
}
