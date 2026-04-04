import { useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Paperclip,
  School,
  Smile,
  Sparkles,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useBridge } from '@/bridge/BridgeContext';
import { ROLE_DISPLAY } from '@/bridge/mockData';
import type { Module, Role } from '@/bridge/types';
import { cx } from '@/bridge/cx';

const ROLE_ICONS: Record<Role, LucideIcon> = {
  teacher: School,
  parent: Users,
  student: GraduationCap,
};

const VIEW_USER_ROLE_ORDER: Record<Role, number> = { teacher: 0, parent: 1, student: 2 };

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
  Icon: LucideIcon;
  label: string;
  hideForStudent?: boolean;
  studentOnly?: boolean;
}[] = [
  { module: 'dashboard', href: '#dashboard', Icon: LayoutDashboard, label: 'Dashboard', hideForStudent: true },
  { module: 'chat', href: '#chat', Icon: MessageSquare, label: 'Chat' },
  { module: 'mood', href: '#mood', Icon: Smile, label: 'Mood', studentOnly: true },
];

export function Sidebar({
  sidebarCollapsed,
  toggleSidebarCollapsed,
  sidebarMobileOpen,
  setSidebarMobileOpen,
  roleDropdownOpen,
  setRoleDropdownOpen,
}: SidebarChromeProps) {
  const { role, setRole, setCurrentUserId, users, currentUser, currentUserId, module, setModule, showToolDemo } =
    useBridge();

  const ddRef = useRef<HTMLDivElement>(null);
  const meta = ROLE_DISPLAY[role];
  const RoleIcon = ROLE_ICONS[role];
  const viewLabel = currentUser?.name ?? meta.label;
  const sortedViewUsers = [...users].sort((a, b) => {
    const o = VIEW_USER_ROLE_ORDER[a.role as Role] - VIEW_USER_ROLE_ORDER[b.role as Role];
    if (o !== 0) return o;
    return a.name.localeCompare(b.name);
  });

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

  const aside = cx(
    'z-40 flex h-full min-h-0 shrink-0 flex-col gap-[1.15rem] overflow-y-auto border-r border-[var(--border-light)] bg-[var(--bg-sidebar)] py-4 transition-[width] duration-200 ease-in-out',
    sidebarCollapsed ? 'w-[var(--sidebar-width-collapsed)] px-1.5' : 'w-[var(--sidebar-width)] px-[0.85rem]',
    'max-md:fixed max-md:bottom-0 max-md:left-0 max-md:top-0 max-md:z-40 max-md:-translate-x-full max-md:shadow-[4px_0_24px_rgba(0,0,0,0.12)] max-md:transition-transform',
    sidebarMobileOpen && 'max-md:translate-x-0',
  );

  return (
    <>
      <button
        type="button"
        className="fixed left-[0.85rem] top-[0.85rem] z-50 hidden h-10 w-10 cursor-pointer flex-col items-center justify-center gap-1 rounded-full border-none bg-[var(--surface)] p-0 shadow-[var(--shadow)] max-md:flex"
        id="sidebar-toggle"
        aria-expanded={sidebarMobileOpen}
        aria-controls="sidebar"
        aria-label="Open or close sidebar"
        onClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      >
        <span className="block h-0.5 w-[1.1rem] rounded-[1px] bg-[var(--text-muted)]" aria-hidden="true" />
        <span className="block h-0.5 w-[1.1rem] rounded-[1px] bg-[var(--text-muted)]" aria-hidden="true" />
        <span className="block h-0.5 w-[1.1rem] rounded-[1px] bg-[var(--text-muted)]" aria-hidden="true" />
      </button>

      <div
        className={cx(
          'fixed inset-0 z-[35] hidden bg-[rgba(32,33,36,0.4)]',
          sidebarMobileOpen && 'block',
        )}
        id="sidebar-backdrop"
        hidden={!sidebarMobileOpen}
        onClick={() => setSidebarMobileOpen(false)}
        aria-hidden="true"
      />

      <aside className={aside} id="sidebar" role="navigation" aria-label="Primary navigation and tools">
        <div
          className={cx(
            'flex min-w-0 items-center gap-1.5 pl-1 pr-0.5',
            sidebarCollapsed ? 'justify-center px-0' : 'justify-between',
          )}
        >
          <div
            className={cx(
              'flex min-w-0 items-center gap-2 px-1',
              sidebarCollapsed && 'hidden',
            )}
          >
            <span className="inline-flex items-center justify-center text-[var(--link-blue)]" aria-hidden="true">
              <Sparkles className="block shrink-0" strokeWidth={2} size={20} />
            </span>
            <span className="text-[1.125rem] font-semibold tracking-tight text-[var(--text)]">BridgeEd</span>
          </div>
          {sidebarCollapsed && <span className="sr-only">BridgeEd</span>}
          <button
            type="button"
            className="hidden size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-[var(--pill-bg)] p-0 text-[var(--text-muted)] hover:bg-[#e8edf3] hover:text-[var(--text)] md:flex"
            id="sidebar-collapse"
            aria-expanded={!sidebarCollapsed}
            aria-controls="sidebar"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggleSidebarCollapsed}
          >
            <span
              className={cx('inline-block transition-transform duration-200 ease-in-out', sidebarCollapsed && 'rotate-180')}
              aria-hidden="true"
            >
              <ChevronLeft className="block shrink-0" strokeWidth={2} size={18} />
            </span>
            <span className="sr-only">Collapse or expand sidebar</span>
          </button>
        </div>

        <div className="relative z-[45]">
          <p
            className={cx(
              'mb-[0.45rem] px-2 py-0 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]',
              sidebarCollapsed && 'm-0 h-0 overflow-hidden',
            )}
            id="role-label"
          >
            View as
          </p>
          <div className="relative w-full" id="role-dropdown" ref={ddRef}>
            <button
              type="button"
              className={cx(
                'flex w-full cursor-pointer items-center gap-[0.45rem] rounded-full border-none bg-[var(--pill-bg)] px-3 py-2 text-left text-[0.9rem] font-medium text-[var(--text)] transition-colors hover:bg-[#e8edf3]',
                sidebarCollapsed && 'justify-center px-1.5 py-[0.55rem]',
              )}
              id="role-dropdown-trigger"
              aria-expanded={roleDropdownOpen}
              aria-haspopup="listbox"
              aria-controls="role-dropdown-menu"
              aria-labelledby="role-label role-dropdown-name"
              aria-label={`View as ${viewLabel}`}
              onClick={(e) => {
                e.stopPropagation();
                setRoleDropdownOpen(!roleDropdownOpen);
              }}
            >
              <span className="inline-flex shrink-0 items-center justify-center leading-none" id="role-dropdown-emoji" aria-hidden="true">
                <RoleIcon className="block shrink-0" strokeWidth={2} size={18} />
              </span>
              <span
                className={cx('min-w-0 flex-1', sidebarCollapsed && 'sr-only')}
                id="role-dropdown-name"
              >
                {viewLabel}
              </span>
              <span
                className={cx(
                  'inline-flex shrink-0 leading-none transition-transform duration-200 ease-in-out',
                  roleDropdownOpen && 'rotate-180',
                  sidebarCollapsed && 'sr-only',
                )}
                aria-hidden="true"
              >
                <ChevronDown className="block shrink-0 text-[var(--text-muted)] opacity-85" strokeWidth={2} size={14} />
              </span>
            </button>
            <div
              className={cx(
                'absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[60] m-0 list-none rounded-[var(--radius)] border border-[var(--border-light)] bg-[var(--surface)] p-[0.35rem] shadow-[0_4px_24px_rgba(60,64,67,0.18),0_1px_2px_rgba(60,64,67,0.08)]',
                sidebarCollapsed && roleDropdownOpen && 'left-full right-auto top-0 ml-[0.35rem] min-w-[11rem]',
              )}
              id="role-dropdown-menu"
              role="listbox"
              tabIndex={-1}
              aria-labelledby="role-label"
              hidden={!roleDropdownOpen}
            >
              {users.length > 0
                ? sortedViewUsers.map((u) => {
                    const r = u.role as Role;
                    const m = ROLE_DISPLAY[r];
                    const OptIcon = ROLE_ICONS[r];
                    const active = u.id === currentUserId;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        className={cx(
                          'flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border-none bg-transparent px-[0.65rem] py-[0.55rem] text-left text-[0.9rem] text-[var(--text)] hover:bg-[var(--pill-bg)]',
                          active && 'bg-[var(--info-banner)] font-semibold text-[var(--link-blue)]',
                        )}
                        role="option"
                        aria-selected={active}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentUserId(u.id);
                          setRoleDropdownOpen(false);
                        }}
                      >
                        <span className="inline-flex items-center justify-center leading-none" aria-hidden="true">
                          <OptIcon className="block shrink-0" strokeWidth={2} size={18} />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate">{u.name}</span>
                          <span className="truncate text-[0.75rem] font-normal text-[var(--text-muted)]">
                            {m.label} · {u.id}
                          </span>
                        </span>
                      </button>
                    );
                  })
                : (['teacher', 'parent', 'student'] as Role[]).map((r) => {
                    const m = ROLE_DISPLAY[r];
                    const active = r === role;
                    const OptIcon = ROLE_ICONS[r];
                    return (
                      <button
                        key={r}
                        type="button"
                        className={cx(
                          'flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border-none bg-transparent px-[0.65rem] py-[0.55rem] text-left text-[0.9rem] text-[var(--text)] hover:bg-[var(--pill-bg)]',
                          active && 'bg-[var(--info-banner)] font-semibold text-[var(--link-blue)]',
                        )}
                        role="option"
                        aria-selected={active}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRole(r);
                          setRoleDropdownOpen(false);
                        }}
                      >
                        <span className="inline-flex items-center justify-center leading-none" aria-hidden="true">
                          <OptIcon className="block shrink-0" strokeWidth={2} size={18} />
                        </span>
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5" aria-label="Modules">
          {NAV_MODULES.map((n) => {
            const hidden =
              (n.hideForStudent && role === 'student') || (n.studentOnly && role !== 'student');
            if (hidden) return null;
            const NavIcon = n.Icon;
            const isActive = module === n.module;
            return (
              <a
                key={n.module}
                href={n.href}
                className={cx(
                  'relative flex items-center gap-[0.55rem] rounded-full px-3 py-[0.55rem] text-[0.9rem] font-medium text-[var(--text)] no-underline hover:bg-[var(--pill-bg)]',
                  isActive && 'bg-[var(--info-banner)] font-semibold text-[var(--link-blue)] shadow-none',
                  sidebarCollapsed && 'justify-center px-1.5',
                )}
                data-module={n.module}
                id={n.module === 'dashboard' ? 'nav-dashboard' : undefined}
                title={n.label}
                hidden={hidden}
                onClick={(e) => onNav(e, n.module)}
              >
                <span className="inline-flex items-center justify-center leading-none opacity-90" aria-hidden="true">
                  <NavIcon className="block shrink-0" strokeWidth={2} size={18} />
                </span>
                <span className={cx(sidebarCollapsed && 'sr-only')}>{n.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[var(--border-light)] pt-[0.65rem]">
          <p
            className={cx(
              'mb-[0.45rem] px-2 py-0 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]',
              sidebarCollapsed && 'm-0 h-0 overflow-hidden',
            )}
            id="tools-label"
          >
            Tools
          </p>
          <div className="flex flex-col gap-[0.35rem]" role="group" aria-labelledby="tools-label">
            <button
              type="button"
              className={cx(
                'flex cursor-pointer items-center gap-1.5 rounded-full border-none bg-[var(--pill-bg)] px-3 py-2 text-left text-[0.8125rem] font-[inherit] text-[var(--text-muted)] hover:bg-[#e8edf3] hover:text-[var(--text)]',
                sidebarCollapsed && 'justify-center px-1.5',
              )}
              id="tool-upload"
              title="Upload a report or transcript (demo)"
              onClick={() =>
                showToolDemo(
                  'Upload report',
                  'Demo: upload weekly notes, report cards, or PDFs so the AI can reference them in chat.',
                )
              }
            >
              <Paperclip className="block shrink-0 opacity-90" strokeWidth={2} size={16} aria-hidden={true} />
              <span className={cx(sidebarCollapsed && 'sr-only')}>Upload report</span>
            </button>
            <button
              type="button"
              className={cx(
                'flex cursor-pointer items-center gap-1.5 rounded-full border-none bg-[var(--pill-bg)] px-3 py-2 text-left text-[0.8125rem] font-[inherit] text-[var(--text-muted)] hover:bg-[#e8edf3] hover:text-[var(--text)]',
                sidebarCollapsed && 'justify-center px-1.5',
              )}
              id="tool-practice"
              title="Generate practice (demo)"
              onClick={() =>
                showToolDemo(
                  'Generate practice',
                  'Demo: create 2–3 short items from the current learning-card topic for the student to try.',
                )
              }
            >
              <ClipboardList className="block shrink-0 opacity-90" strokeWidth={2} size={16} aria-hidden={true} />
              <span className={cx(sidebarCollapsed && 'sr-only')}>Practice</span>
            </button>
            <button
              type="button"
              className={cx(
                'flex cursor-pointer items-center gap-1.5 rounded-full border-none bg-[var(--pill-bg)] px-3 py-2 text-left text-[0.8125rem] font-[inherit] text-[var(--text-muted)] hover:bg-[#e8edf3] hover:text-[var(--text)]',
                sidebarCollapsed && 'justify-center px-1.5',
              )}
              id="tool-snippets"
              title="Quick phrases (demo)"
              onClick={() =>
                showToolDemo(
                  'Quick phrases',
                  'Demo: one-tap inserts like “Explain shorter” or “Give a real-life example” into the composer.',
                )
              }
            >
              <Zap className="block shrink-0 opacity-90" strokeWidth={2} size={16} aria-hidden={true} />
              <span className={cx(sidebarCollapsed && 'sr-only')}>Snippets</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
