/* eslint-disable react-refresh/only-export-components -- BridgeProvider + useBridge hook */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { AI_DEMO, INITIAL_INBOX, INITIAL_THREADS, MODULES, ROLE_COPY } from '@/bridge/mockData';
import type { InboxItem, LearningCardItem, ModalState, Module, Role, ThreadMessage } from '@/bridge/types';

const COLLAPSE_KEY = 'bridgeed-sidebar-collapsed';

function cloneInbox(initial: typeof INITIAL_INBOX) {
  return {
    parent: [...initial.parent],
    student: [...initial.student],
    teacher: [...initial.teacher],
  };
}

function cloneThreads(initial: Record<string, ThreadMessage[]>) {
  const out: Record<string, ThreadMessage[]> = {};
  for (const k of Object.keys(initial)) {
    out[k] = initial[k]!.map((m) => ({ ...m }));
  }
  return out;
}

interface BridgeContextValue {
  role: Role;
  setRole: (r: Role) => void;
  module: Module;
  setModule: (m: Module) => void;
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  sidebarMobileOpen: boolean;
  setSidebarMobileOpen: (open: boolean) => void;
  roleDropdownOpen: boolean;
  setRoleDropdownOpen: (open: boolean) => void;
  inboxByRole: Record<Role, InboxItem[]>;
  threads: Record<string, ThreadMessage[]>;
  selectedInboxId: string | null;
  setSelectedInboxId: Dispatch<SetStateAction<string | null>>;
  pushTeacherReport: (title: string, body: string, toStudents: boolean, toParents: boolean) => void;
  openCardThreadFromDashboard: (card: LearningCardItem) => void;
  appendChatMessage: (threadId: string, msg: ThreadMessage) => void;
  modal: ModalState;
  openModal: (m: ModalState) => void;
  closeModal: () => void;
  showToolDemo: (title: string, body: string) => void;
  showGeneric: (title: string, body: string) => void;
  aiMessages: Array<{ role: 'user' | 'ai'; text: string }>;
  setAiMessages: React.Dispatch<React.SetStateAction<Array<{ role: 'user' | 'ai'; text: string }>>>;
  loadAiDemo: () => void;
  getHints: () => { ai: string; chat: string; mood: string; dashboard?: string };
}

const BridgeContext = createContext<BridgeContextValue | null>(null);

function parseModuleFromHash(): Module {
  const raw = (typeof window !== 'undefined' ? window.location.hash : '') || '#dashboard';
  const h = raw.slice(1).toLowerCase();
  if (MODULES.includes(h as Module)) return h as Module;
  return 'dashboard';
}

function readSidebarCollapsedFromStorage(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

export function BridgeProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>('parent');
  const [module, setModuleState] = useState<Module>(() => parseModuleFromHash());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsedFromStorage);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [inboxByRole, setInboxByRole] = useState(() => cloneInbox(INITIAL_INBOX));
  const [threads, setThreads] = useState(() => cloneThreads(INITIAL_THREADS));
  const [selectedInboxId, setSelectedInboxId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [aiMessages, setAiMessages] = useState(() =>
    AI_DEMO.map((m) => ({ role: m.role, text: m.text })),
  );

  const applySidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const syncHashToModule = useCallback(() => {
    setModuleState(parseModuleFromHash());
  }, []);

  useEffect(() => {
    window.addEventListener('hashchange', syncHashToModule);
    return () => window.removeEventListener('hashchange', syncHashToModule);
  }, [syncHashToModule]);

  const setModule = useCallback((m: Module) => {
    if (!MODULES.includes(m)) return;
    setModuleState(m);
    if (typeof history !== 'undefined' && history.replaceState) {
      history.replaceState(null, '', `#${m}`);
    }
  }, []);

  const setRole = useCallback(
    (r: Role) => {
      setRoleState(r);
      setRoleDropdownOpen(false);
      if (r === 'teacher' || r === 'parent') {
        setModule('dashboard');
      } else {
        setModuleState((cur) => {
          if (cur !== 'dashboard') return cur;
          if (typeof history !== 'undefined' && history.replaceState) {
            history.replaceState(null, '', '#ai');
          }
          return 'ai';
        });
      }
    },
    [setModule],
  );

  const getHints = useCallback(() => {
    const c = ROLE_COPY[role];
    const base = {
      ai: c?.ai ?? '',
      chat: c?.chat ?? '',
      mood: c?.mood ?? '',
      dashboard: c?.dashboard,
    };
    return base;
  }, [role]);

  const pushTeacherReport = useCallback((title: string, body: string, toStudents: boolean, toParents: boolean) => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const baseId = `rep-${Date.now()}`;
    const trimmed = body.trim();
    const excerpt = trimmed.length > 600 ? `${trimmed.slice(0, 600)}…` : trimmed;
    const threadLine: ThreadMessage = { who: 'Ms. Lee', type: 'in', text: excerpt };

    setThreads((prev) => {
      const next = { ...prev };
      if (toStudents) {
        const sid = `${baseId}-s`;
        next[sid] = [{ ...threadLine }];
      }
      if (toParents) {
        const pid = `${baseId}-p`;
        next[pid] = [{ who: threadLine.who, type: threadLine.type, text: threadLine.text }];
      }
      return next;
    });

    setInboxByRole((prev) => {
      const next = { ...prev, parent: [...prev.parent], student: [...prev.student], teacher: [...prev.teacher] };
      if (toStudents) {
        const sid = `${baseId}-s`;
        next.student.unshift({
          id: sid,
          title: `[Report] ${title}`,
          date: dateStr,
          kind: 'report',
        });
      }
      if (toParents) {
        const pid = `${baseId}-p`;
        next.parent.unshift({
          id: pid,
          title: `[Report] ${title}`,
          date: dateStr,
          kind: 'report',
        });
      }
      return next;
    });
  }, []);

  const openCardThreadFromDashboard = useCallback(
    (card: LearningCardItem) => {
      const id = card.threadId;
      const dateStr = new Date().toISOString().slice(0, 10);
      setThreads((prev) => {
        if (prev[id]) return prev;
        const body =
          `${card.summary}\n\n` +
          'In this card we:\n' +
          '• Explain the idea in parent‑friendly language.\n' +
          '• Suggest 1–2 materials to use at home.\n' +
          '• List a short plan for tonight or this week.\n\n' +
          '(Demo content only.)';
        return {
          ...prev,
          [id]: [{ who: 'BridgeEd', type: 'in', text: body }],
        };
      });
      setInboxByRole((prev) => {
        if (prev.parent.some((m) => m.id === id)) return prev;
        return {
          ...prev,
          parent: [{ id, title: `[Card] ${card.title}`, date: dateStr, kind: 'card' }, ...prev.parent],
        };
      });
      setRoleState('parent');
      setModuleState('chat');
      if (typeof history !== 'undefined' && history.replaceState) {
        history.replaceState(null, '', '#chat');
      }
      setSelectedInboxId(id);
    },
    [],
  );

  const appendChatMessage = useCallback((threadId: string, msg: ThreadMessage) => {
    setThreads((prev) => ({
      ...prev,
      [threadId]: [...(prev[threadId] ?? []), msg],
    }));
  }, []);

  const openModal = useCallback((m: ModalState) => setModal(m), []);
  const closeModal = useCallback(() => setModal({ type: 'none' }), []);
  const showGeneric = useCallback((title: string, body: string) => {
    setModal({ type: 'generic', title, body });
  }, []);
  const showToolDemo = useCallback(
    (title: string, body: string) => {
      showGeneric(title, body);
    },
    [showGeneric],
  );

  const loadAiDemo = useCallback(() => {
    setAiMessages(AI_DEMO.map((m) => ({ role: m.role, text: m.text })));
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    applySidebarCollapsed(!sidebarCollapsed);
  }, [applySidebarCollapsed, sidebarCollapsed]);

  const value = useMemo<BridgeContextValue>(
    () => ({
      role,
      setRole,
      module,
      setModule,
      sidebarCollapsed,
      toggleSidebarCollapsed,
      sidebarMobileOpen,
      setSidebarMobileOpen,
      roleDropdownOpen,
      setRoleDropdownOpen,
      inboxByRole,
      threads,
      selectedInboxId,
      setSelectedInboxId,
      pushTeacherReport,
      openCardThreadFromDashboard,
      appendChatMessage,
      modal,
      openModal,
      closeModal,
      showToolDemo,
      showGeneric,
      aiMessages,
      setAiMessages,
      loadAiDemo,
      getHints,
    }),
    [
      role,
      setRole,
      module,
      setModule,
      sidebarCollapsed,
      toggleSidebarCollapsed,
      sidebarMobileOpen,
      roleDropdownOpen,
      setRoleDropdownOpen,
      inboxByRole,
      threads,
      selectedInboxId,
      setSelectedInboxId,
      pushTeacherReport,
      openCardThreadFromDashboard,
      appendChatMessage,
      modal,
      openModal,
      closeModal,
      showToolDemo,
      showGeneric,
      aiMessages,
      setAiMessages,
      loadAiDemo,
      getHints,
    ],
  );

  return <BridgeContext.Provider value={value}>{children}</BridgeContext.Provider>;
}

export function useBridge() {
  const ctx = useContext(BridgeContext);
  if (!ctx) throw new Error('useBridge must be used within BridgeProvider');
  return ctx;
}
