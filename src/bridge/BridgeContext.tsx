/* eslint-disable react-refresh/only-export-components -- BridgeProvider + useBridge hook */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { INITIAL_INBOX, INITIAL_THREADS, MODULES, ROLE_COPY } from '@/bridge/mockData';
import type { InboxItem, LearningCardItem, ModalState, Module, Role, ThreadMessage } from '@/bridge/types';
import { VIEW_AS_USER_STORAGE_KEY } from '@/bridge/view-storage';
import { getDataLayer } from '@/data';
import type { UserBackend } from '@/data/entity/user-backend';

function pickDefaultUserId(list: UserBackend[]): string | null {
  if (list.length === 0) return null;
  try {
    const fromLs = localStorage.getItem(VIEW_AS_USER_STORAGE_KEY);
    if (fromLs && list.some((u) => u.id === fromLs)) return fromLs;
  } catch {
    /* ignore */
  }
  const t1 = list.find((u) => u.id === 'teacher-1');
  if (t1) return t1.id;
  return list[0]!.id;
}

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
  /** IndexedDB users (empty until loaded or if API mode). */
  users: UserBackend[];
  currentUserId: string | null;
  currentUser: UserBackend | undefined;
  setCurrentUserId: (id: string) => void;
  module: Module;
  setModule: (m: Module) => void;
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
  getHints: () => { ai: string; chat: string; mood: string; dashboard?: string };
  /** Bump when learning cards change in storage so dashboards refetch. */
  learningCardsEpoch: number;
  bumpLearningCards: () => void;
  /** Bump when student mood entries change so parent dashboard refetches. */
  studentMoodsEpoch: number;
  bumpStudentMoods: () => void;
}

const BridgeContext = createContext<BridgeContextValue | null>(null);

function parseModuleFromHash(): Module {
  const raw = (typeof window !== 'undefined' ? window.location.hash : '') || '#dashboard';
  const h = raw.slice(1).toLowerCase();
  if (MODULES.includes(h as Module)) return h as Module;
  return 'dashboard';
}

export function BridgeProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserBackend[]>([]);
  const [currentUserId, setCurrentUserIdState] = useState<string | null>(null);
  /** When IndexedDB has no `users` rows, fall back to picking a role only (legacy demo). */
  const [roleWhenNoUsers, setRoleWhenNoUsers] = useState<Role>('teacher');

  const [module, setModuleState] = useState<Module>(() => parseModuleFromHash());
  const [inboxByRole, setInboxByRole] = useState(() => cloneInbox(INITIAL_INBOX));
  const [threads, setThreads] = useState(() => cloneThreads(INITIAL_THREADS));
  const [selectedInboxId, setSelectedInboxId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [learningCardsEpoch, setLearningCardsEpoch] = useState(0);
  const [studentMoodsEpoch, setStudentMoodsEpoch] = useState(0);

  useEffect(() => {
    const syncHashToModule = () => setModuleState(parseModuleFromHash());
    window.addEventListener('hashchange', syncHashToModule);
    return () => window.removeEventListener('hashchange', syncHashToModule);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getDataLayer()
      .users.list()
      .then((list) => {
        if (cancelled) return;
        setUsers(list);
        setCurrentUserIdState((prev) => {
          if (prev && list.some((u) => u.id === prev)) return prev;
          return pickDefaultUserId(list);
        });
      })
      .catch(() => {
        if (!cancelled) {
          setUsers([]);
          setCurrentUserIdState(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const role: Role =
    users.length > 0
      ? ((users.find((u) => u.id === currentUserId)?.role ?? 'teacher') as Role)
      : roleWhenNoUsers;

  const currentUser: UserBackend | undefined =
    users.length > 0 && currentUserId ? users.find((u) => u.id === currentUserId) : undefined;

  useEffect(() => {
    if (role !== 'student' && module === 'mood') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync hash when role cannot use Mood (student-only)
      setModuleState('dashboard');
      if (typeof history !== 'undefined' && history.replaceState) {
        history.replaceState(null, '', '#dashboard');
      }
    }
  }, [role, module]);

  const setModule = (m: Module) => {
    if (!MODULES.includes(m)) return;
    setModuleState(m);
    if (typeof history !== 'undefined' && history.replaceState) {
      history.replaceState(null, '', `#${m}`);
    }
  };

  const applyRoleNavigation = (r: Role) => {
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
  };

  const persistViewUserId = (id: string) => {
    try {
      localStorage.setItem(VIEW_AS_USER_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  };

  const setCurrentUserId = (id: string) => {
    if (!users.some((u) => u.id === id)) return;
    setCurrentUserIdState(id);
    persistViewUserId(id);
    const u = users.find((x) => x.id === id);
    if (u) applyRoleNavigation(u.role as Role);
  };

  const setRole = (r: Role) => {
    if (users.length > 0) {
      const first = users.find((u) => u.role === r);
      if (first) {
        setCurrentUserId(first.id);
      }
      return;
    }
    setRoleWhenNoUsers(r);
    applyRoleNavigation(r);
  };

  const getHints = () => {
    const c = ROLE_COPY[role];
    return {
      ai: c?.ai ?? '',
      chat: c?.chat ?? '',
      mood: c?.mood ?? '',
      dashboard: c?.dashboard,
    };
  };

  const pushTeacherReport = (title: string, body: string, toStudents: boolean, toParents: boolean) => {
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
  };

  const openCardThreadFromDashboard = (card: LearningCardItem) => {
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
    if (users.length > 0) {
      const parent = users.find((u) => u.role === 'parent');
      if (parent) {
        setCurrentUserIdState(parent.id);
        persistViewUserId(parent.id);
      }
    } else {
      setRoleWhenNoUsers('parent');
    }
    setModuleState('chat');
    if (typeof history !== 'undefined' && history.replaceState) {
      history.replaceState(null, '', '#chat');
    }
    setSelectedInboxId(id);
  };

  const appendChatMessage = (threadId: string, msg: ThreadMessage) => {
    setThreads((prev) => ({
      ...prev,
      [threadId]: [...(prev[threadId] ?? []), msg],
    }));
  };

  const openModal = (m: ModalState) => setModal(m);
  const closeModal = () => setModal({ type: 'none' });
  const showGeneric = (title: string, body: string) => {
    setModal({ type: 'generic', title, body });
  };
  const showToolDemo = (title: string, body: string) => {
    showGeneric(title, body);
  };

  const bumpLearningCards = () => setLearningCardsEpoch((n) => n + 1);
  const bumpStudentMoods = () => setStudentMoodsEpoch((n) => n + 1);

  const value: BridgeContextValue = {
    role,
    setRole,
    users,
    currentUserId,
    currentUser,
    setCurrentUserId,
    module,
    setModule,
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
    getHints,
    learningCardsEpoch,
    bumpLearningCards,
    studentMoodsEpoch,
    bumpStudentMoods,
  };

  return <BridgeContext.Provider value={value}>{children}</BridgeContext.Provider>;
}

export function useBridge() {
  const ctx = useContext(BridgeContext);
  if (!ctx) throw new Error('useBridge must be used within BridgeProvider');
  return ctx;
}
