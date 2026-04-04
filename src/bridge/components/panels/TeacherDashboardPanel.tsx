import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { showGeneric, openModal, learningCardsEpoch, bumpLearningCards, currentUser } = useBridge();
  const teacherAuthorId = currentUser?.role === 'teacher' ? currentUser.id : '';
  const [studentFilter, setStudentFilter] = useState('');
  const [learningCards, setLearningCards] = useState<LearningCardItem[]>([]);
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
      .learningCards.listByUserId(teacherAuthorId)
      .then((rows) => {
        if (!cancelled) setLearningCards(rows.map(learningCardBackendToItem));
      })
      .catch(() => {
        if (!cancelled) setLearningCards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [learningCardsEpoch, teacherAuthorId]);

  const q = studentFilter.trim().toLowerCase();
  const filteredStudents = !q
    ? DASH_STUDENTS
    : DASH_STUDENTS.filter((s) => s.name.toLowerCase().includes(q));

  const sections = [
    <DashboardCard
      key="report"
      span={12}
      id="dash-report-title"
      title={t('dashboard.teacher.classReport')}
      titleColor="sky"
      banner
      subtitle={t('dashboard.teacher.classReportSubtitle')}
      headerActions={
        <Button variant="primary" pill id="btn-open-report-modal" onClick={() => openModal({ type: 'report' })}>
          {t('dashboard.teacher.createReport')}
        </Button>
      }
    />,

    <DashboardCard
      key="cards"
      span={12}
      className="teacher-card-section"
      id="teacher-cards-title"
      title={t('dashboard.teacher.learningCards')}
      titleColor="sky"
      subtitle={t('dashboard.teacher.learningCardsSubtitle')}
      headerActions={
        <Button variant="primary" pill id="btn-teacher-create-card" onClick={() => openModal({ type: 'learningCard' })}>
          {t('dashboard.teacher.createCard')}
        </Button>
      }
    >
      <div className="parent-cards-grid mt-2" id="teacher-cards">
        {learningCards.length === 0 ? (
          <p className="parent-cards__hint" style={{ gridColumn: '1 / -1' }}>
            {t('dashboard.teacher.noCards')}
          </p>
        ) : (
          learningCards.map((c) => (
            <LearningCardTile
              key={c.id}
              card={c}
              subjectPillScope="teacher"
              ctaLabel={t('dashboard.teacher.ctaOpen')}
              onOpen={(card) => openModal({ type: 'teacherCardPreviewTodo', card })}
              debugDelete={debugMode}
              onDebugDelete={debugMode ? onDebugDeleteLearningCard : undefined}
            />
          ))
        )}
      </div>
    </DashboardCard>,

    <DashboardCard key="todo" span={6} id="dash-todo-title" title={t('dashboard.teacher.today')} titleColor="warm">
      <ul className="todo-list" id="dash-todo-list">
        {DASH_TODOS.map((todo) => {
          const id = `todo-${todo.id}`;
          return (
            <li key={todo.id}>
              <input type="checkbox" id={id} checked={todo.done} readOnly disabled />
              <label htmlFor={id}>{todo.text}</label>
            </li>
          );
        })}
      </ul>
    </DashboardCard>,

    <DashboardCard key="publish" span={6} id="dash-publish-title" title={t('dashboard.teacher.recentPosts')} titleColor="lavender">
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
        {t('dashboard.teacher.newLearningCard')}
      </Button>
    </DashboardCard>,

    <DashboardCard key="stats" span={12} id="dash-stats-title" title={t('dashboard.teacher.classPulse')} titleColor="sky">
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
      title={t('dashboard.teacher.studentDirectory')}
      headerActions={
        <input
          type="search"
          className="field__input field__input--inline field__input--pill"
          id="student-filter"
          placeholder={t('dashboard.teacher.filterPlaceholder')}
          aria-label={t('dashboard.teacher.filterAria')}
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
        />
      }
    >
      <div className="table-wrap table-wrap--flush">
        <table className="data-table data-table--compact" id="dash-students-table">
          <thead>
            <tr>
              <th>{t('dashboard.teacher.colStudent')}</th>
              <th>{t('dashboard.teacher.colGrade')}</th>
              <th>{t('dashboard.teacher.colParent')}</th>
              <th>{t('dashboard.teacher.colLastNote')}</th>
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
                      showGeneric(t('dashboard.teacher.studentDetailTitle'), t('dashboard.teacher.studentDetailBody'))
                    }
                  >
                    {t('dashboard.teacher.view')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>,

    <DashboardCard key="schedule" span={12} id="dash-schedule-title" title={t('dashboard.teacher.thisWeek')} titleColor="warm">
      <div className="schedule-week" id="dash-schedule">
        <ScheduleWeek days={DASH_SCHEDULE} />
      </div>
    </DashboardCard>,
  ];

  return <DashboardShell active={active} dashHint={dashHint} gridId="teacher-dashboard" sections={sections} />;
}
