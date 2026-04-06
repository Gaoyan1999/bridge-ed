/* eslint-disable react-refresh/only-export-components -- BridgeProvider + useBridge hook */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { BOOKING_PENDING_THREAD_ID } from '@/bridge/parent-booking-ids';
import { threadMessageFromParentBooking } from '@/bridge/parent-booking-thread';
import { INITIAL_INBOX, INITIAL_THREADS, MODULES } from '@/bridge/mockData';
import {
  BROADCAST_FEED_THREAD_ID_PARENT,
  BROADCAST_FEED_THREAD_ID_STUDENT,
  BROADCAST_FEED_THREAD_ID_TEACHER,
} from '@/bridge/broadcast-inbox-ids';
import {
  threadMessageFromBroadcastBackend,
  threadMessageFromBroadcastBackendTeacherView,
  threadMessageFromTeacherBroadcastPayload,
} from '@/bridge/broadcast-thread';
import {
  threadMessageFromReportBackend,
  threadMessageFromTeacherReportPayload,
} from '@/bridge/teacher-report-thread';
import type {
  InboxItem,
  LearningCardItem,
  ModalState,
  Module,
  Role,
  TeacherBroadcastPayload,
  TeacherReportPayload,
  ThreadMessage,
} from '@/bridge/types';
import { resolveParentSummaryFromLearningCardItem } from '@/data';
import { bookingTargetsTeacher, resolveTeacherAuthorId } from '@/bridge/teacher-user';
import { VIEW_AS_USER_STORAGE_KEY } from '@/bridge/view-storage';
import { getDataLayer } from '@/data';
import { BROADCAST_SCHEMA_VERSION, type BroadcastBackend } from '@/data/entity/broadcast-backend';
import { PARENT_BOOKING_SCHEMA_VERSION, type ParentBookingBackend } from '@/data/entity/parent-booking-backend';
import { REPORT_SCHEMA_VERSION, type ReportBackend } from '@/data/entity/report-backend';
import type { UserBackend } from '@/data/entity/user-backend';

function sortBroadcastsBySentAsc(a: BroadcastBackend, b: BroadcastBackend): number {
  return a.sentAt.localeCompare(b.sentAt) || a.id.localeCompare(b.id);
}

/** Rows for the teacher’s merged feed (same author filter as `broadcasts.listByAuthorUserId`). */
function broadcastRowsForTeacher(rows: BroadcastBackend[], authorId: string): BroadcastBackend[] {
  return rows.filter((r) => {
    if (r.authorUserId === authorId) return true;
    if (authorId === 'teacher-1' && r.authorUserId === '1') return true;
    return false;
  });
}

function dedupeInboxByIdKeepFirst(items: InboxItem[]): InboxItem[] {
  const seen = new Set<string>();
  const out: InboxItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

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
    out[k] = initial[k]!.map((m) => ({
      ...m,
      attachments: m.attachments?.map((a) => ({ ...a })),
      learningCard: m.learningCard ? { ...m.learningCard } : undefined,
      teacherReport: m.teacherReport ? { ...m.teacherReport } : undefined,
      broadcastPost: m.broadcastPost ? { ...m.broadcastPost } : undefined,
      authorUserId: m.authorUserId,
      bookingDetail: m.bookingDetail ? { ...m.bookingDetail } : undefined,
    }));
  }
  return out;
}

function initialKnowledgeMessagesForCard(card: LearningCardItem, role: Role): ThreadMessage[] {
  /** Students get `childKnowledge` UI + chat; never auto-seed the parent-facing summary. */
  if (role === 'student') {
    return [];
  }
  /** Parent summary is shown in `LearningCardParentKnowledgeView`; do not duplicate it as the first thread message. */
  if (role === 'parent') {
    return [];
  }
  const body = resolveParentSummaryFromLearningCardItem(card);
  return [{ who: 'BridgeEd AI', type: 'in', text: body }];
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
  pushTeacherReport: (payload: TeacherReportPayload) => void;
  pushBroadcast: (payload: TeacherBroadcastPayload) => void;
  /** Parent (or teacher “preview as parent”): open AI chat for a learning card in Knowledge. */
  openKnowledgeFromCard: (card: LearningCardItem) => void;
  appendChatMessage: (threadId: string, msg: ThreadMessage) => void;
  /** Per–learning-card AI threads (key = card `threadId`). */
  knowledgeThreads: Record<string, ThreadMessage[]>;
  selectedKnowledgeThreadId: string | null;
  setSelectedKnowledgeThreadId: Dispatch<SetStateAction<string | null>>;
  appendKnowledgeMessage: (threadId: string, msg: ThreadMessage) => void;
  /** First visit to a card’s AI thread: seed the intro message if empty. */
  seedKnowledgeThreadIfEmpty: (card: LearningCardItem) => void;
  /** After a learning card document is removed from storage, drop its Knowledge thread cache so parents/students don’t see stale chat. */
  removeKnowledgeThreadForDeletedCard: (threadId: string) => void;
  modal: ModalState;
  openModal: (m: ModalState) => void;
  closeModal: () => void;
  showToolDemo: (title: string, body: string) => void;
  showGeneric: (title: string, body: string) => void;
  /** Bump when learning cards change in storage so dashboards refetch. */
  learningCardsEpoch: number;
  bumpLearningCards: () => void;
  /** Bump when student mood entries change so parent dashboard refetches. */
  studentMoodsEpoch: number;
  bumpStudentMoods: () => void;
  /** Persisted parent booking requests (IndexedDB). */
  parentBookings: ParentBookingBackend[];
  /** Pending booking count for the current teacher (sidebar badge). */
  pendingBookingCount: number;
  submitParentBooking: (payload: { teacherId: string; date: string; bookSlot: string; topic: string }) => void;
  respondToParentBooking: (bookingId: string, action: 'accept' | 'reject') => void;
  findBookingByThreadId: (threadId: string) => ParentBookingBackend | undefined;
}

const BridgeContext = createContext<BridgeContextValue | null>(null);

function parseModuleFromHash(): Module {
  const raw = (typeof window !== 'undefined' ? window.location.hash : '') || '#dashboard';
  const h = raw.slice(1).toLowerCase();
  /** Legacy sidebar link; practice sheets live under Knowledge for students. */
  if (h === 'quiz') return 'knowledge';
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
  const [knowledgeThreads, setKnowledgeThreads] = useState<Record<string, ThreadMessage[]>>({});
  const [selectedInboxId, setSelectedInboxId] = useState<string | null>(null);
  const [selectedKnowledgeThreadId, setSelectedKnowledgeThreadId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [learningCardsEpoch, setLearningCardsEpoch] = useState(0);
  const [studentMoodsEpoch, setStudentMoodsEpoch] = useState(0);
  const [parentBookings, setParentBookings] = useState<ParentBookingBackend[]>([]);

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

  /** Restore report threads + inbox from IndexedDB after refresh. */
  useEffect(() => {
    let cancelled = false;
    void getDataLayer()
      .reports.listAll()
      .then((reports) => {
        if (cancelled || reports.length === 0) return;
        setThreads((prev) => {
          const next = { ...prev };
          for (const r of reports) {
            const msg = threadMessageFromReportBackend(r, users);
            if (r.audience.toStudents) {
              const tid = r.messageThreadIds?.student ?? `${r.id}-s`;
              // Always refresh: first hydration may run before `users` loads, leaving `who` as raw id.
              next[tid] = [{ ...msg }];
            }
            if (r.audience.toParents) {
              const tid = r.messageThreadIds?.parent ?? `${r.id}-p`;
              next[tid] = [{ ...msg }];
            }
          }
          return next;
        });
        setInboxByRole((prev) => {
          const parentSeen = new Set(prev.parent.map((i) => i.id));
          const studentSeen = new Set(prev.student.map((i) => i.id));
          const parentAdds: InboxItem[] = [];
          const studentAdds: InboxItem[] = [];
          for (const r of reports) {
            const dateStr = r.sentAt.slice(0, 10);
            if (r.audience.toParents) {
              const pid = r.messageThreadIds?.parent ?? `${r.id}-p`;
              if (!parentSeen.has(pid)) {
                parentSeen.add(pid);
                parentAdds.push({ id: pid, title: r.title, date: dateStr, kind: 'report' });
              }
            }
            if (r.audience.toStudents) {
              const sid = r.messageThreadIds?.student ?? `${r.id}-s`;
              if (!studentSeen.has(sid)) {
                studentSeen.add(sid);
                studentAdds.push({ id: sid, title: r.title, date: dateStr, kind: 'report' });
              }
            }
          }
          return {
            ...prev,
            parent: dedupeInboxByIdKeepFirst([...parentAdds, ...prev.parent]),
            student: dedupeInboxByIdKeepFirst([...studentAdds, ...prev.student]),
          };
        });
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [users]);

  /** Hydrate broadcast threads + inbox from IndexedDB `BroadcastBackend` rows only (no mock thread text). */
  useEffect(() => {
    let cancelled = false;
    void getDataLayer()
      .broadcasts.listAll()
      .then((rows) => {
        if (cancelled) return;
        const authorId = resolveTeacherAuthorId(users, currentUserId);
        const parentRows = rows.filter((r) => r.audience.toParents).sort(sortBroadcastsBySentAsc);
        const studentRows = rows.filter((r) => r.audience.toStudents).sort(sortBroadcastsBySentAsc);
        const teacherRows = broadcastRowsForTeacher(rows, authorId).sort(sortBroadcastsBySentAsc);

        setThreads((prev) => {
          const next = { ...prev };
          next[BROADCAST_FEED_THREAD_ID_PARENT] = parentRows.map((b) => ({
            ...threadMessageFromBroadcastBackend(b, users),
          }));
          next[BROADCAST_FEED_THREAD_ID_STUDENT] = studentRows.map((b) => ({
            ...threadMessageFromBroadcastBackend(b, users),
          }));
          next[BROADCAST_FEED_THREAD_ID_TEACHER] = teacherRows.map((b) => ({
            ...threadMessageFromBroadcastBackendTeacherView(b, users),
          }));
          return next;
        });
        setInboxByRole((prev) => {
          const parentAdds: InboxItem[] = [];
          const studentAdds: InboxItem[] = [];
          const teacherAdds: InboxItem[] = [];
          if (parentRows.length > 0) {
            const latest = parentRows[parentRows.length - 1]!.sentAt.slice(0, 10);
            parentAdds.push({
              id: BROADCAST_FEED_THREAD_ID_PARENT,
              title: '',
              date: latest,
              kind: 'broadcast',
            });
          }
          if (studentRows.length > 0) {
            const latest = studentRows[studentRows.length - 1]!.sentAt.slice(0, 10);
            studentAdds.push({
              id: BROADCAST_FEED_THREAD_ID_STUDENT,
              title: '',
              date: latest,
              kind: 'broadcast',
            });
          }
          if (teacherRows.length > 0) {
            const latest = teacherRows[teacherRows.length - 1]!.sentAt.slice(0, 10);
            teacherAdds.push({
              id: BROADCAST_FEED_THREAD_ID_TEACHER,
              title: '',
              date: latest,
              kind: 'broadcast',
            });
          }
          const parentNoBroadcast = prev.parent.filter((i) => i.kind !== 'broadcast');
          const studentNoBroadcast = prev.student.filter((i) => i.kind !== 'broadcast');
          const teacherNoBroadcast = prev.teacher.filter((i) => i.kind !== 'broadcast');
          return {
            ...prev,
            parent: dedupeInboxByIdKeepFirst([...parentAdds, ...parentNoBroadcast]),
            student: dedupeInboxByIdKeepFirst([...studentAdds, ...studentNoBroadcast]),
            teacher: dedupeInboxByIdKeepFirst([...teacherAdds, ...teacherNoBroadcast]),
          };
        });
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [users, currentUserId]);

  const loadParentBookings = useCallback(() => {
    return getDataLayer()
      .parentBookings.listAll()
      .then((rows) => {
        setParentBookings(rows);
      })
      .catch(() => {
        setParentBookings([]);
      });
  }, []);

  useEffect(() => {
    void loadParentBookings();
  }, [loadParentBookings]);

  /** Merge persisted `ParentBookingBackend` rows into Messages inbox + threads. */
  useEffect(() => {
    const teacherId = resolveTeacherAuthorId(users, currentUserId);
    const confirmedForTeacher = parentBookings.filter(
      (b) => bookingTargetsTeacher(b, teacherId) && b.status === 'confirmed' && b.messageThreadId,
    );

    const allConfirmedThreadIds = new Set(
      parentBookings.filter((b) => b.status === 'confirmed' && b.messageThreadId).map((b) => b.messageThreadId!),
    );

    setThreads((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (key.startsWith('booking-') && !allConfirmedThreadIds.has(key)) {
          delete next[key];
        }
      }
      for (const b of confirmedForTeacher) {
        const tid = b.messageThreadId!;
        next[tid] = [{ ...threadMessageFromParentBooking(b, users) }];
      }
      return next;
    });

    setInboxByRole((prev) => {
      const teacherIdsToReplace = new Set<string>();
      for (const b of confirmedForTeacher) {
        if (b.messageThreadId) teacherIdsToReplace.add(b.messageThreadId);
      }

      const teacherStripped = prev.teacher.filter(
        (i) => !teacherIdsToReplace.has(i.id) && i.id !== BOOKING_PENDING_THREAD_ID,
      );

      const teacherAdds: InboxItem[] = [];
      for (const b of confirmedForTeacher) {
        if (!b.messageThreadId) continue;
        const student = users.find((u) => u.id === b.studentId);
        const name = student?.name ?? b.studentId;
        teacherAdds.push({
          id: b.messageThreadId,
          title: `Booking: ${name}'s parents`,
          date: b.date,
          kind: 'dm',
        });
      }

      const parentStripped = prev.parent.filter((i) => !allConfirmedThreadIds.has(i.id));

      const parentAdds: InboxItem[] = [];
      if (currentUserId) {
        const cur = users.find((u) => u.id === currentUserId);
        if (cur?.role === 'parent') {
          for (const b of parentBookings) {
            if (b.parentId !== currentUserId || b.status !== 'confirmed' || !b.messageThreadId) continue;
            const student = users.find((u) => u.id === b.studentId);
            const name = student?.name ?? b.studentId;
            parentAdds.push({
              id: b.messageThreadId,
              title: `Booking: ${name}'s parents`,
              date: b.date,
              kind: 'dm',
            });
          }
        }
      }

      return {
        ...prev,
        teacher: dedupeInboxByIdKeepFirst([...teacherAdds, ...teacherStripped]),
        parent: dedupeInboxByIdKeepFirst([...parentAdds, ...parentStripped]),
      };
    });
  }, [parentBookings, users, currentUserId]);

  const role: Role =
    users.length > 0
      ? ((users.find((u) => u.id === currentUserId)?.role ?? 'teacher') as Role)
      : roleWhenNoUsers;

  const prevRoleRef = useRef<Role | null>(null);
  useEffect(() => {
    const prev = prevRoleRef.current;
    prevRoleRef.current = role;
    if (role === 'student' && prev != null && prev !== 'student') {
      setKnowledgeThreads({});
    }
  }, [role]);

  const currentUser: UserBackend | undefined =
    users.length > 0 && currentUserId ? users.find((u) => u.id === currentUserId) : undefined;

  const pendingBookingCount = useMemo(() => {
    if (!currentUserId) return 0;
    const u = users.find((x) => x.id === currentUserId);
    if (u?.role !== 'teacher') return 0;
    const tid = resolveTeacherAuthorId(users, currentUserId);
    return parentBookings.filter((b) => bookingTargetsTeacher(b, tid) && b.status === 'pending').length;
  }, [parentBookings, users, currentUserId]);

  const findBookingByThreadId = useCallback(
    (threadId: string) => parentBookings.find((b) => b.messageThreadId === threadId),
    [parentBookings],
  );

  const submitParentBooking = useCallback(
    (payload: { teacherId: string; date: string; bookSlot: string; topic: string }) => {
      if (!currentUser || currentUser.role !== 'parent') return;
      const studentId = currentUser.children?.[0];
      if (!studentId) return;
      if (!payload.date.trim() || payload.bookSlot === '__none__') return;
      const parentId = currentUser.id;
      const iso = new Date().toISOString();
      const id = `pb-${Date.now()}`;
      const record: ParentBookingBackend = {
        id,
        schemaVersion: PARENT_BOOKING_SCHEMA_VERSION,
        createdAt: iso,
        updatedAt: iso,
        parentId,
        studentId,
        teacherId: payload.teacherId,
        date: payload.date,
        bookSlot: payload.bookSlot,
        topic: payload.topic.trim(),
        status: 'pending',
      };
      void getDataLayer()
        .parentBookings.put(record)
        .then(() => loadParentBookings())
        .catch(() => {
          /* ignore */
        });
    },
    [currentUser, loadParentBookings],
  );

  const respondToParentBooking = useCallback(
    (bookingId: string, action: 'accept' | 'reject') => {
      void getDataLayer()
        .parentBookings.get(bookingId)
        .then((existing) => {
          if (!existing || existing.status !== 'pending') return;
          const iso = new Date().toISOString();
          if (action === 'reject') {
            return getDataLayer().parentBookings.put({
              ...existing,
              status: 'cancelled',
              updatedAt: iso,
            });
          }
          const messageThreadId = `booking-${existing.id}`;
          return getDataLayer().parentBookings.put({
            ...existing,
            status: 'confirmed',
            updatedAt: iso,
            messageThreadId,
          });
        })
        .then(() => loadParentBookings())
        .catch(() => {
          /* ignore */
        });
    },
    [loadParentBookings],
  );

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
      // Student: Knowledge as the default when switching view-as user (sidebar).
      setModule('knowledge');
    }
  };

  useEffect(() => {
    if (role !== 'student' && module === 'mood') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync hash when role cannot use Mood (student-only)
      setModuleState('dashboard');
      if (typeof history !== 'undefined' && history.replaceState) {
        history.replaceState(null, '', '#dashboard');
      }
    }
  }, [role, module]);

  useEffect(() => {
    if (role !== 'student') return;
    if (module !== 'dashboard') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- student default view is Knowledge
    setModule('knowledge');
  }, [role, module]);

  useEffect(() => {
    if (module !== 'knowledge' || role !== 'teacher') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Knowledge is for parents & students only
    setModuleState('dashboard');
    if (typeof history !== 'undefined' && history.replaceState) {
      history.replaceState(null, '', '#dashboard');
    }
  }, [role, module]);

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

  const pushTeacherReport = (payload: TeacherReportPayload) => {
    const { title, summary, body, toStudents, toParents } = payload;
    const dateStr = new Date().toISOString().slice(0, 10);
    const baseId = `rep-${Date.now()}`;
    const authorId = resolveTeacherAuthorId(users, currentUserId);
    const threadLine = threadMessageFromTeacherReportPayload(
      {
        title,
        summary,
        body,
        toStudents,
        toParents,
      },
      authorId,
      users,
    );

    const iso = new Date().toISOString();
    const reportRecord: ReportBackend = {
      id: baseId,
      schemaVersion: REPORT_SCHEMA_VERSION,
      createdAt: iso,
      updatedAt: iso,
      authorUserId: authorId,
      sentAt: iso,
      title,
      summary,
      body,
      audience: { toStudents, toParents },
      messageThreadIds: {
        ...(toStudents ? { student: `${baseId}-s` } : {}),
        ...(toParents ? { parent: `${baseId}-p` } : {}),
      },
    };
    void getDataLayer()
      .reports.put(reportRecord)
      .catch(() => {
        /* ignore IndexedDB write errors */
      });

    setThreads((prev) => {
      const next = { ...prev };
      if (toStudents) {
        const sid = `${baseId}-s`;
        next[sid] = [{ ...threadLine }];
      }
      if (toParents) {
        const pid = `${baseId}-p`;
        next[pid] = [{ ...threadLine }];
      }
      return next;
    });

    setInboxByRole((prev) => {
      const next = { ...prev, parent: [...prev.parent], student: [...prev.student], teacher: [...prev.teacher] };
      if (toStudents) {
        const sid = `${baseId}-s`;
        next.student.unshift({
          id: sid,
          title,
          date: dateStr,
          kind: 'report',
        });
      }
      if (toParents) {
        const pid = `${baseId}-p`;
        next.parent.unshift({
          id: pid,
          title,
          date: dateStr,
          kind: 'report',
        });
      }
      return next;
    });
  };

  const pushBroadcast = (payload: TeacherBroadcastPayload) => {
    const { title, body, toStudents, toParents } = payload;
    const dateStr = new Date().toISOString().slice(0, 10);
    const baseId = `bc-${Date.now()}`;
    const authorId = resolveTeacherAuthorId(users, currentUserId);
    const threadLine = threadMessageFromTeacherBroadcastPayload(payload, undefined, authorId, users);

    const iso = new Date().toISOString();
    const record: BroadcastBackend = {
      id: baseId,
      schemaVersion: BROADCAST_SCHEMA_VERSION,
      createdAt: iso,
      updatedAt: iso,
      authorUserId: authorId,
      sentAt: iso,
      title,
      body,
      audience: { toStudents, toParents },
      messageThreadIds: {
        ...(toStudents ? { student: BROADCAST_FEED_THREAD_ID_STUDENT } : {}),
        ...(toParents ? { parent: BROADCAST_FEED_THREAD_ID_PARENT } : {}),
      },
    };
    void getDataLayer()
      .broadcasts.put(record)
      .catch(() => {
        /* ignore IndexedDB write errors */
      });

    setThreads((prev) => {
      const next = { ...prev };
      if (toParents) {
        const pid = BROADCAST_FEED_THREAD_ID_PARENT;
        const existing = next[pid] ?? [];
        next[pid] = [...existing, { ...threadLine }];
      }
      if (toStudents) {
        const sid = BROADCAST_FEED_THREAD_ID_STUDENT;
        const existing = next[sid] ?? [];
        next[sid] = [...existing, { ...threadLine }];
      }
      if (toParents || toStudents) {
        const tid = BROADCAST_FEED_THREAD_ID_TEACHER;
        const existingTeacher = next[tid] ?? [];
        const lineTeacher: ThreadMessage = { ...threadLine, who: 'You', type: 'out' };
        next[tid] = [...existingTeacher, lineTeacher];
      }
      return next;
    });

    setInboxByRole((prev) => {
      const next = { ...prev, parent: [...prev.parent], student: [...prev.student], teacher: [...prev.teacher] };
      if (toParents) {
        next.parent = next.parent.filter((i) => i.kind !== 'broadcast');
        next.parent.unshift({
          id: BROADCAST_FEED_THREAD_ID_PARENT,
          title: '',
          date: dateStr,
          kind: 'broadcast',
        });
      }
      if (toStudents) {
        next.student = next.student.filter((i) => i.kind !== 'broadcast');
        next.student.unshift({
          id: BROADCAST_FEED_THREAD_ID_STUDENT,
          title: '',
          date: dateStr,
          kind: 'broadcast',
        });
      }
      if (toParents || toStudents) {
        next.teacher = next.teacher.filter((i) => i.kind !== 'broadcast');
        next.teacher.unshift({
          id: BROADCAST_FEED_THREAD_ID_TEACHER,
          title: '',
          date: dateStr,
          kind: 'broadcast',
        });
      }
      return next;
    });
  };

  const seedKnowledgeThreadIfEmpty = useCallback(
    (card: LearningCardItem) => {
      const id = card.threadId;
      setKnowledgeThreads((prev) => {
        if (prev[id]?.length) return prev;
        return { ...prev, [id]: initialKnowledgeMessagesForCard(card, role) };
      });
    },
    [role],
  );

  const removeKnowledgeThreadForDeletedCard = useCallback((threadId: string) => {
    const id = threadId.trim();
    if (!id) return;
    setKnowledgeThreads((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedKnowledgeThreadId((cur) => (cur === id ? null : cur));
  }, []);

  const openKnowledgeFromCard = (card: LearningCardItem) => {
    const id = card.threadId;
    seedKnowledgeThreadIfEmpty(card);
    if (users.length > 0) {
      const parent = users.find((u) => u.role === 'parent');
      if (parent) {
        setCurrentUserIdState(parent.id);
        persistViewUserId(parent.id);
      }
    } else {
      setRoleWhenNoUsers('parent');
    }
    setSelectedKnowledgeThreadId(id);
    setModuleState('knowledge');
    if (typeof history !== 'undefined' && history.replaceState) {
      history.replaceState(null, '', '#knowledge');
    }
  };

  const appendChatMessage = (threadId: string, msg: ThreadMessage) => {
    setThreads((prev) => ({
      ...prev,
      [threadId]: [...(prev[threadId] ?? []), msg],
    }));
  };

  const appendKnowledgeMessage = (threadId: string, msg: ThreadMessage) => {
    setKnowledgeThreads((prev) => ({
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
    knowledgeThreads,
    selectedInboxId,
    setSelectedInboxId,
    selectedKnowledgeThreadId,
    setSelectedKnowledgeThreadId,
    pushTeacherReport,
    pushBroadcast,
    openKnowledgeFromCard,
    appendChatMessage,
    appendKnowledgeMessage,
    seedKnowledgeThreadIfEmpty,
    removeKnowledgeThreadForDeletedCard,
    modal,
    openModal,
    closeModal,
    showToolDemo,
    showGeneric,
    learningCardsEpoch,
    bumpLearningCards,
    studentMoodsEpoch,
    bumpStudentMoods,
    parentBookings,
    pendingBookingCount,
    submitParentBooking,
    respondToParentBooking,
    findBookingByThreadId,
  };

  return <BridgeContext.Provider value={value}>{children}</BridgeContext.Provider>;
}

export function useBridge() {
  const ctx = useContext(BridgeContext);
  if (!ctx) throw new Error('useBridge must be used within BridgeProvider');
  return ctx;
}
