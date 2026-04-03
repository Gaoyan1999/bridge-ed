import { BridgeModals } from '@/bridge/components/BridgeModals';
import { SkipLink } from '@/bridge/components/SkipLink';
import { Sidebar } from '@/bridge/components/Sidebar';
import { AiPanel } from '@/bridge/components/panels/AiPanel';
import { ChatPanel } from '@/bridge/components/panels/ChatPanel';
import { DashboardPanel } from '@/bridge/components/panels/DashboardPanel';
import { MoodPanel } from '@/bridge/components/panels/MoodPanel';
import { useBridge } from '@/bridge/BridgeContext';
import { cx } from '@/bridge/cx';

function BridgeShell() {
  const { module, role, sidebarCollapsed, sidebarMobileOpen } = useBridge();

  return (
    <div
      className={cx('app', sidebarCollapsed && 'app--sidebar-collapsed', sidebarMobileOpen && 'sidebar-open')}
      data-app
    >
      <Sidebar />
      <main className="main" id="main-content" aria-labelledby="main-heading">
        <div className="main__canvas">
          <h1 className="visually-hidden" id="main-heading">
            BridgeEd workspace
          </h1>
          <DashboardPanel active={module === 'dashboard'} />
          <AiPanel active={module === 'ai'} />
          <ChatPanel active={module === 'chat'} />
          <MoodPanel key={`${module}-${role}`} active={module === 'mood'} />
        </div>
      </main>
      <BridgeModals />
    </div>
  );
}

export function BridgeApp() {
  return (
    <>
      <SkipLink />
      <BridgeShell />
    </>
  );
}
