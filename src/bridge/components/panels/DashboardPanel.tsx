import { useState } from 'react';
import { useBridge } from '@/bridge/BridgeContext';
import {
  DASH_PUBLISH,
  DASH_SCHEDULE,
  DASH_STATS,
  DASH_STUDENTS,
  DASH_TODOS,
  PARENT_DASH_CARDS,
  PARENT_DASH_MOOD,
  PARENT_DASH_SCHEDULE,
  ROLE_COPY,
} from '@/bridge/mockData';
import { LearningCardTile } from '@/bridge/components/LearningCardTile';
import { ScheduleWeek } from '@/bridge/components/ScheduleWeek';
import { Button } from '@/bridge/components/ui/Button';
import { cx } from '@/bridge/cx';

const DASHBOARD_HINT_DEFAULT =
  'Teacher: class report and pulse · Parent: learning cards, to‑dos, and schedule (demo).';

export function DashboardPanel({ active }: { active: boolean }) {
  const { role, openCardThreadFromDashboard, showGeneric, openModal } = useBridge();
  const [studentFilter, setStudentFilter] = useState('');

  const q = studentFilter.trim().toLowerCase();
  const filteredStudents = !q
    ? DASH_STUDENTS
    : DASH_STUDENTS.filter((s) => s.name.toLowerCase().includes(q));

  const dashHint =
    role === 'teacher' ? ROLE_COPY.teacher.dashboard ?? DASHBOARD_HINT_DEFAULT : DASHBOARD_HINT_DEFAULT;

  if (role === 'student') {
    return (
      <section
        className={cx('panel', 'panel--dashboard', active && 'is-visible')}
        id="panel-dashboard"
        data-panel="dashboard"
        role="region"
        aria-labelledby="panel-dashboard-title"
        hidden={!active}
      />
    );
  }

  if (role === 'teacher') {
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
        <div className="dashboard-grid" id="teacher-dashboard">
        <section className="dash-card dash-card--wide dash-card--surface dash-card--banner" aria-labelledby="dash-report-title">
          <div className="dash-card__head dash-card__head--report">
            <div>
              <h3 className="dash-card__title dash-card__title--sky" id="dash-report-title">
                Class report
              </h3>
              <p className="dash-card__sub">
                Write or generate a short report, then push it to <strong>students</strong>, <strong>parents</strong>, or
                both.
              </p>
            </div>
            <Button variant="primary" pill id="btn-open-report-modal" onClick={() => openModal({ type: 'report' })}>
              Create report
            </Button>
          </div>
        </section>

        <section className="dash-card dash-card--surface teacher-card-section" aria-labelledby="teacher-cards-title">
          <div className="dash-card__head dash-card__head--report">
            <div>
              <h3 className="dash-card__title dash-card__title--sky" id="teacher-cards-title">
                Learning cards
              </h3>
              <p className="dash-card__sub">Concept cards for families: definitions, materials, and a simple plan.</p>
            </div>
            <Button
              variant="secondary"
              pill
              id="btn-teacher-create-card"
              onClick={() =>
                showGeneric(
                  'New learning card',
                  'Demo flow: enter class notes → generate parent summary and tonight’s actions → preview & edit → pick audience (class or selected parents) → send. Matches the teacher “publish learning card” flow in UI/UX-Flows.',
                )
              }
            >
              Create card
            </Button>
          </div>
          <div className="parent-cards-grid" id="teacher-cards">
            {PARENT_DASH_CARDS.map((c) => (
              <LearningCardTile
                key={c.id}
                card={c}
                ctaLabel="Open parent view"
                onOpen={openCardThreadFromDashboard}
              />
            ))}
          </div>
        </section>

        <section className="dash-card dash-card--surface" aria-labelledby="dash-todo-title">
          <h3 className="dash-card__title dash-card__title--warm" id="dash-todo-title">
            Today
          </h3>
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
        </section>

        <section className="dash-card dash-card--surface" aria-labelledby="dash-publish-title">
          <h3 className="dash-card__title dash-card__title--lavender" id="dash-publish-title">
            Recent posts
          </h3>
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
            onClick={() =>
              showGeneric(
                'New learning card',
                'Demo flow: enter class notes → generate parent summary and tonight’s actions → preview & edit → pick audience (class or selected parents) → send. Matches the teacher “publish learning card” flow in UI/UX-Flows.',
              )
            }
          >
            + New learning card
          </Button>
        </section>

        <section className="dash-card dash-card--wide dash-card--surface" aria-labelledby="dash-stats-title">
          <h3 className="dash-card__title dash-card__title--sky" id="dash-stats-title">
            Class pulse
          </h3>
          <div className="stat-row" id="dash-stats">
            {DASH_STATS.map((s) => (
              <div key={s.label} className="stat-pill">
                <div className="stat-pill__value">{s.value}</div>
                <div className="stat-pill__label">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="dash-card dash-card--wide dash-card--surface" aria-labelledby="dash-students-title">
          <div className="dash-card__head">
            <h3 className="dash-card__title" id="dash-students-title">
              Student directory
            </h3>
            <input
              type="search"
              className="field__input field__input--inline field__input--pill"
              id="student-filter"
              placeholder="Filter by name…"
              aria-label="Filter students"
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
            />
          </div>
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
        </section>

        <section className="dash-card dash-card--wide dash-card--surface" aria-labelledby="dash-schedule-title">
          <h3 className="dash-card__title dash-card__title--warm" id="dash-schedule-title">
            This week
          </h3>
          <div className="schedule-week" id="dash-schedule">
            <ScheduleWeek days={DASH_SCHEDULE} />
          </div>
        </section>
      </div>
      </section>
    );
  }

  /* parent */
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
      <section className="dash-card dash-card--wide dash-card--surface parent-card-section" aria-labelledby="parent-cards-title">
        <div className="dash-card__head">
          <h3 className="dash-card__title dash-card__title--sky" id="parent-cards-title">
            Learning cards
          </h3>
          <p className="parent-cards__hint">Short explanations of key concepts your child is learning.</p>
        </div>
        <div className="parent-cards-grid" id="parent-cards">
          {PARENT_DASH_CARDS.map((c) => (
            <LearningCardTile key={c.id} card={c} ctaLabel="Open in Messages" onOpen={openCardThreadFromDashboard} />
          ))}
        </div>
      </section>

      <section className="dash-card dash-card--wide dash-card--surface parent-schedule-section" aria-labelledby="parent-schedule-title">
        <h3 className="dash-card__title dash-card__title--lavender" id="parent-schedule-title">
          Your child’s schedule
        </h3>
        <div className="schedule-week" id="parent-schedule">
          <ScheduleWeek days={PARENT_DASH_SCHEDULE} />
        </div>
      </section>

      <section className="dash-card dash-card--wide dash-card--surface parent-mood-section" aria-labelledby="parent-mood-title">
        <h3 className="dash-card__title dash-card__title--warm" id="parent-mood-title">
          Your child’s mood
        </h3>
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
      </section>
    </div>
    </section>
  );
}
