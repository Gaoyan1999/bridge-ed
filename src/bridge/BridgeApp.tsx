import { useState } from 'react';
import { BridgeModals } from '@/bridge/components/BridgeModals';
import { SkipLink } from '@/bridge/components/SkipLink';
import { Sidebar } from '@/bridge/components/Sidebar';
import { AiPanel } from '@/bridge/components/panels/AiPanel';
import { ChatPanel } from '@/bridge/components/panels/ChatPanel';
import { DashboardPanel } from '@/bridge/components/panels/DashboardPanel';
import { MoodPanel } from '@/bridge/components/panels/MoodPanel';
import { useBridge } from '@/bridge/BridgeContext';
import { cx } from '@/bridge/cx';

const COLLAPSE_KEY = 'bridgeed-sidebar-collapsed';

function readSidebarCollapsedFromStorage(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

function BridgeShell() {
  const { module, role } = useBridge();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsedFromStorage);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div
      className={cx('app', sidebarCollapsed && 'app--sidebar-collapsed', sidebarMobileOpen && 'sidebar-open')}
      data-app
    >
      <Sidebar
        sidebarCollapsed={sidebarCollapsed}
        toggleSidebarCollapsed={toggleSidebarCollapsed}
        sidebarMobileOpen={sidebarMobileOpen}
        setSidebarMobileOpen={setSidebarMobileOpen}
        roleDropdownOpen={roleDropdownOpen}
        setRoleDropdownOpen={setRoleDropdownOpen}
      />
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
