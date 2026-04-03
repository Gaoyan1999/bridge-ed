import { useEffect, useRef } from 'react';
import { useBridge } from '@/bridge/BridgeContext';
import { ROLE_DISPLAY } from '@/bridge/mockData';
import type { Module, Role } from '@/bridge/types';
import { cx } from '@/bridge/cx';

export interface SidebarChromeProps {
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  sidebarMobileOpen: boolean;
  setSidebarMobileOpen: (open: boolean) => void;
  roleDropdownOpen: boolean;
  setRoleDropdownOpen: (open: boolean) => void;
}

const NAV_MODULES: {
  module: Module;
  href: string;
  icon: string;
  label: string;
  /** Match prototype: dashboard link hidden for student role */
  hideForStudent?: boolean;
}[] = [
  { module: 'dashboard', href: '#dashboard', icon: '▣', label: 'Dashboard', hideForStudent: true },
  { module: 'chat', href: '#chat', icon: '💬', label: 'Chat' },
  { module: 'mood', href: '#mood', icon: '◎', label: 'Mood' },
];

export function Sidebar({
  sidebarCollapsed,
  toggleSidebarCollapsed,
  sidebarMobileOpen,
  setSidebarMobileOpen,
  roleDropdownOpen,
  setRoleDropdownOpen,
}: SidebarChromeProps) {
  const { role, setRole, module, setModule, showToolDemo } = useBridge();

  const ddRef = useRef<HTMLDivElement>(null);
  const meta = ROLE_DISPLAY[role];

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!roleDropdownOpen) return;
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [roleDropdownOpen, setRoleDropdownOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !roleDropdownOpen) return;
      setRoleDropdownOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [roleDropdownOpen, setRoleDropdownOpen]);

  const onNav = (e: React.MouseEvent<HTMLAnchorElement>, mod: Module) => {
    e.preventDefault();
    setModule(mod);
    setSidebarMobileOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="sidebar-toggle"
        id="sidebar-toggle"
        aria-expanded={sidebarMobileOpen}
        aria-controls="sidebar"
        aria-label="Open or close sidebar"
        onClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      >
        <span className="sidebar-toggle__bar" aria-hidden="true"></span>
        <span className="sidebar-toggle__bar" aria-hidden="true"></span>
        <span className="sidebar-toggle__bar" aria-hidden="true"></span>
      </button>

      <div
        className={cx('sidebar-backdrop', sidebarMobileOpen && 'is-open')}
        id="sidebar-backdrop"
        hidden={!sidebarMobileOpen}
        onClick={() => setSidebarMobileOpen(false)}
        aria-hidden="true"
      />

      <aside
        className="sidebar"
        id="sidebar"
        role="navigation"
        aria-label="Primary navigation and tools"
      >
        <div className="sidebar__brand-row">
          <div className="sidebar__brand">
            <span className="sidebar__logo" aria-hidden="true">
              ✦
            </span>
            <span className="sidebar__title sidebar__text">BridgeEd</span>
          </div>
          <button
            type="button"
            className="sidebar-collapse"
            id="sidebar-collapse"
            aria-expanded={!sidebarCollapsed}
            aria-controls="sidebar"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggleSidebarCollapsed}
          >
            <span className="sidebar-collapse__icon" aria-hidden="true">
              ⟨
            </span>
            <span className="visually-hidden">Collapse or expand sidebar</span>
          </button>
        </div>

        <div className="sidebar__block sidebar__block--role">
          <p className="sidebar__label" id="role-label">
            <span className="sidebar__text">View as</span>
          </p>
          <div className={cx('role-dropdown', roleDropdownOpen && 'is-open')} id="role-dropdown" ref={ddRef}>
            <button
              type="button"
              className="role-dropdown__trigger"
              id="role-dropdown-trigger"
              aria-expanded={roleDropdownOpen}
              aria-haspopup="listbox"
              aria-controls="role-dropdown-menu"
              aria-labelledby="role-label role-dropdown-name"
              aria-label={`View as ${meta.label}`}
              onClick={(e) => {
                e.stopPropagation();
                setRoleDropdownOpen(!roleDropdownOpen);
              }}
            >
              <span className="role-dropdown__emoji" id="role-dropdown-emoji" aria-hidden="true">
                {meta.emoji}
              </span>
              <span className="role-dropdown__name sidebar__text" id="role-dropdown-name">
                {meta.label}
              </span>
              <span className="role-dropdown__chevron" aria-hidden="true">
                ▾
              </span>
            </button>
            <div
              className="role-dropdown__menu"
              id="role-dropdown-menu"
              role="listbox"
              tabIndex={-1}
              aria-labelledby="role-label"
              hidden={!roleDropdownOpen}
            >
              {(['parent', 'student', 'teacher'] as Role[]).map((r) => {
                const m = ROLE_DISPLAY[r];
                const active = r === role;
                return (
                  <button
                    key={r}
                    type="button"
                    className={cx('role-dropdown__option', active && 'is-active')}
                    role="option"
                    aria-selected={active}
                    onClick={(e) => {
                      e.stopPropagation();
                      setRole(r);
                      setRoleDropdownOpen(false);
                    }}
                  >
                    <span className="role-dropdown__opt-emoji" aria-hidden="true">
                      {m.emoji}
                    </span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Modules">
          {NAV_MODULES.map((n) => {
            const hidden = n.hideForStudent && role === 'student';
            if (hidden) return null;
            return (
              <a
                key={n.module}
                href={n.href}
                className={cx(
                  'nav-item',
                  n.hideForStudent && 'nav-item--teacher-only',
                  module === n.module && 'is-active',
                )}
                data-module={n.module}
                id={n.module === 'dashboard' ? 'nav-dashboard' : undefined}
                title={n.label}
                hidden={hidden}
                onClick={(e) => onNav(e, n.module)}
              >
                <span className="nav-item__icon" aria-hidden="true">
                  {n.icon}
                </span>
                <span className="sidebar__text">{n.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="sidebar__tools">
          <p className="sidebar__label" id="tools-label">
            <span className="sidebar__text">Tools</span>
          </p>
          <div className="tool-list" role="group" aria-labelledby="tools-label">
            <button
              type="button"
              className="tool-btn tool-btn--pill"
              id="tool-upload"
              title="Upload a report or transcript (demo)"
              onClick={() =>
                showToolDemo(
                  'Upload report',
                  'Demo: upload weekly notes, report cards, or PDFs so the AI can reference them in chat.',
                )
              }
            >
              <span aria-hidden="true">📎</span> <span className="sidebar__text">Upload report</span>
            </button>
            <button
              type="button"
              className="tool-btn tool-btn--pill"
              id="tool-practice"
              title="Generate practice (demo)"
              onClick={() =>
                showToolDemo(
                  'Generate practice',
                  'Demo: create 2–3 short items from the current learning-card topic for the student to try.',
                )
              }
            >
              <span aria-hidden="true">📋</span> <span className="sidebar__text">Practice</span>
            </button>
            <button
              type="button"
              className="tool-btn tool-btn--pill"
              id="tool-snippets"
              title="Quick phrases (demo)"
              onClick={() =>
                showToolDemo(
                  'Quick phrases',
                  'Demo: one-tap inserts like “Explain shorter” or “Give a real-life example” into the composer.',
                )
              }
            >
              <span aria-hidden="true">⚡</span> <span className="sidebar__text">Snippets</span>
            </button>
          </div>
        </div>

        <p className="sidebar__foot">
          <span className="sidebar__text">Prototype · mock data</span>
        </p>
      </aside>
    </>
  );
}
