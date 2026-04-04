import { useTranslation } from 'react-i18next';
import { useBridge } from '@/bridge/BridgeContext';
import { cx } from '@/bridge/cx';
import { ParentDashboardPanel } from './ParentDashboardPanel';
import { TeacherDashboardPanel } from './TeacherDashboardPanel';

export function DashboardPanel({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const { role } = useBridge();

  const dashHint =
    role === 'teacher'
      ? t('hints.teacher.dashboard')
      : role === 'parent'
        ? t('hints.parent.dashboard')
        : t('hints.dashboardFallback');

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

  if (role === 'parent') {
    return <ParentDashboardPanel active={active} dashHint={dashHint} />;
  }

  return <TeacherDashboardPanel active={active} dashHint={dashHint} />;
}
