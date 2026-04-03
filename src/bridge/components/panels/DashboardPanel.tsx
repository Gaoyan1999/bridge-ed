import { useBridge } from '@/bridge/BridgeContext';
import { ROLE_COPY } from '@/bridge/mockData';
import { cx } from '@/bridge/cx';
import { ParentDashboardPanel } from './ParentDashboardPanel';
import { TeacherDashboardPanel } from './TeacherDashboardPanel';

const DASHBOARD_HINT_DEFAULT =
  'Teacher: class report and pulse · Parent: learning cards, to‑dos, and schedule (demo).';

export function DashboardPanel({ active }: { active: boolean }) {
  const { role } = useBridge();

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
    return <TeacherDashboardPanel active={active} dashHint={dashHint} />;
  }

  return <ParentDashboardPanel active={active} dashHint={dashHint} />;
}
