import type { LearningCardStudentFinishedType } from '@/data/entity/learning-card-backend';
import type { StudentMoodKind } from '@/data/entity/student-mood-backend';
import type { InboxItem, ParentMoodChildProfile, Role, ScheduleDay, ThreadMessage } from './types';

export const MODULES = ['dashboard', 'chat', 'knowledge', 'mood'] as const;

export const ROLE_DISPLAY: Record<
  string,
  { emoji: string; label: string }
> = {
  parent: { emoji: '👪', label: 'Parent' },
  student: { emoji: '👨‍🎓', label: 'Student' },
  teacher: { emoji: '🧑‍🏫', label: 'Teacher' },
};

export const DASH_TODOS = [
  { id: '1', text: 'Reply to Alex Wang’s parent booking request', done: false },
  { id: '2', text: 'Review “Quadratic equations” card feedback (completion low)', done: false },
  { id: '3', text: 'Draft next week’s quiz note', done: true },
];

export const DASH_PUBLISH = [
  { title: 'This week: quadratics — solution strategies', date: '2026-04-01', meta: 'Delivered · 92% read' },
  { title: 'Holiday schedule update', date: '2026-03-28', meta: 'Broadcast · whole class' },
];

export const DASH_STATS = [
  { label: 'Card feedback rate', value: '78%' },
  { label: 'Top struggle', value: 'Factoring' },
  { label: 'Parents to nudge', value: '3' },
];

export const DASH_STUDENTS = [
  { name: 'Alex Wang', grade: 'G9', parent: 'Ms. Wang', feedback: '3/30 factoring' },
  { name: 'Betty Li', grade: 'G9', parent: 'Mr. Li', feedback: '—' },
  { name: 'Carol Zhang', grade: 'G9', parent: 'Ms. Zhang', feedback: '4/1 quiz worry' },
];

/** Parent mood week: one row per child. Student mood save uses the first entry (TODO: auth). */
export const PARENT_MOOD_CHILDREN: ParentMoodChildProfile[] = [
  { studentId: 'student-1', displayName: 'Alex Wang' },
  { studentId: 'student-2', displayName: 'Betty Li' },
];

/** Demo parent user id — matches `reference/data.json` until session auth exists. */
export const DEMO_PARENT_USER_ID = 'parent-1';

export const DEMO_STUDENT_MOOD_PROFILE = PARENT_MOOD_CHILDREN[0]!;

/** Class / lesson titles for the learning-card wizard (demo roster). */
export const LEARNING_CARD_CLASS_OPTIONS = [
  'Week 14 — Factoring review',
  'Week 13 — Quadratic equations intro',
  'Week 12 — Pythagorean theorem & applications',
  'Shakespeare — Reading workshop',
  'Dept week — light homework & review',
] as const;

export const LEARNING_CARD_GRADE_OPTIONS = ['G7', 'G8', 'G9', 'G10', 'G11', 'G12'] as const;

/** Subject line for the learning-card wizard — teachers usually reuse the same pick (demo). */
export const LEARNING_CARD_SUBJECT_OPTIONS = [  
  'Math',
  'English',
  'Literature',
  'Science',
  'History',
  'Art',
] as const;

export const DASH_SCHEDULE: ScheduleDay[] = [
  { day: 'Mon 4/1', items: ['4:00 PM dept meeting', '6:30 PM parent slot'] },
  { day: 'Tue 4/2', items: ['After-school help'] },
  { day: 'Wed 4/3', items: ['5:30 PM parent slot', 'Grading'] },
  { day: 'Thu 4/4', items: ['—'] },
  { day: 'Fri 4/5', items: ['Quiz draft due'] },
];

export const PARENT_DASH_SCHEDULE: ScheduleDay[] = [
  {
    day: 'Mon 4/1',
    items: ['08:30 Math — Geometry', '10:00 English — Reading workshop', 'Evening: homework check‑in'],
  },
  {
    day: 'Tue 4/2',
    items: ['09:15 Math — Algebra', '13:30 Science', 'After school: extra help available'],
  },
  {
    day: 'Wed 4/3',
    items: ['08:30 English — Shakespeare', '10:45 History', 'Evening: light review only'],
  },
  {
    day: 'Thu 4/4',
    items: ['09:15 Math — Quiz review', '14:00 Art', 'Evening: free reading'],
  },
  {
    day: 'Fri 4/5',
    items: ['08:30 Math — Short quiz', '11:00 PE', 'Weekend: optional practice set'],
  },
];

/** Demo week row — emoji/label come from `studentMoodKindEmoji` / `studentMoodKindLabel` per `kind`. */
export const PARENT_DASH_MOOD: { day: string; kind: StudentMoodKind }[] = [
  { day: 'Mon', kind: 'okay' },
  { day: 'Tue', kind: 'happy' },
  { day: 'Wed', kind: 'neutral' },
  { day: 'Thu', kind: 'tired' },
  { day: 'Fri', kind: 'excited' },
  { day: 'Sat', kind: 'excited' },
  { day: 'Sun', kind: 'excited' },
];

export const INITIAL_INBOX: Record<Role, InboxItem[]> = {
  parent: [{ id: 'n2', title: 'Ms. Lee: note on next week’s quiz', date: '2026-03-30', kind: 'dm' }],
  student: [],
  teacher: [
    { id: 't1', title: 'Booking: Alex Wang’s parent', date: '2026-04-02', kind: 'booking' },
    { id: 't2', title: 'Draft: broadcast', date: '2026-04-01', kind: 'draft' },
  ],
};

export const INITIAL_THREADS: Record<string, ThreadMessage[]> = {
  n2: [
    {
      who: 'Ms. Lee',
      type: 'in',
      text: 'Next week’s quiz focuses on variations of the in-class examples. If your child gets stuck on a step, send the question number.',
    },
    { who: 'You', type: 'out', text: 'Thanks—we’ll focus on example 3 this weekend.' },
  ],
  t1: [
    {
      who: 'System',
      type: 'in',
      text: 'Booking request: Wed 5:30–5:50 PM, topic “factoring homework” (Alex Wang’s parent).',
    },
  ],
  t2: [{ who: 'You', type: 'in', text: 'Draft not sent yet. Open Broadcast to continue editing.' }],
  'mock-chat-parent-g1': [
    {
      who: 'Ms. Lee',
      type: 'in',
      speakerRole: 'teacher',
      sentAt: '2026-04-05T08:40:00.000Z',
      text: 'Reminder: review pack for Thursday. Optional extra problems are in the pinned PDF.',
    },
    { who: 'Sam', type: 'in', sentAt: '2026-04-05T09:15:00.000Z', text: 'Thanks — will print the PDF tonight.' },
  ],
  'mock-chat-parent-p1': [
    {
      who: 'PTA',
      type: 'in',
      sentAt: '2026-04-01T11:10:00.000Z',
      text: 'Spring picnic signup closes Friday. Volunteers needed for setup at 10 AM.',
    },
  ],
  'mock-chat-student-g1': [
    { who: 'Alex', type: 'in', sentAt: '2026-04-04T15:25:00.000Z', text: 'Anyone free to check Q4 on the practice sheet?' },
    { who: 'You', type: 'out', sentAt: '2026-04-04T15:27:00.000Z', text: 'I got k = 2 — want to compare steps?' },
  ],
  'mock-chat-student-p1': [
    {
      who: 'Ms. Lee',
      type: 'in',
      speakerRole: 'teacher',
      sentAt: '2026-03-30T13:05:00.000Z',
      text: 'If you’re stuck on the quiz review, message me the question number before 4 PM.',
    },
  ],
  'mock-chat-teacher-g1': [
    {
      who: 'You',
      type: 'out',
      sentAt: '2026-04-06T07:30:00.000Z',
      text: 'Unit test recap pushed to families — see Report in Messages.',
    },
    {
      who: 'Carol’s parent',
      type: 'in',
      sentAt: '2026-04-06T07:46:00.000Z',
      text: 'Thanks for the summary. Will review Example 3 with Carol.',
    },
  ],
  'mock-chat-teacher-g2': [
    {
      who: 'Dept lead',
      type: 'in',
      sentAt: '2026-04-02T09:10:00.000Z',
      text: 'Please confirm quadratics scope for next term by Friday EOD.',
    },
  ],
  'mock-chat-teacher-p1': [
    {
      who: 'Alex Wang’s parent',
      type: 'in',
      sentAt: '2026-04-03T10:20:00.000Z',
      text: 'Could we move Wednesday’s check-in to 6 PM?',
    },
  ],
};

/** Class report modal — simulated “Math 9 unit test (quadratics)” dataset. */
export const REPORT_DEMO_EXAM_LABEL =
  'Math 9 — Unit test: Quadratic functions (Apr 4, 2026) · 28 students · 45 min';

export const REPORT_DRAFT_TITLE = 'Math 9 — Unit test: Quadratic functions';

export const REPORT_DRAFT_SUMMARY =
  'Mean score sits in the mid band; students who did well handled vertex form and the discriminant. The most common slip was sign errors when moving terms across the equals sign—worth one short review before the next quiz.';

export const REPORT_DRAFT_BODY =
  'Hello families,\n\n' +
  'Here’s a concise read-out from this week’s quadratic functions unit test (paper + structured working).\n\n' +
  'What went well\n' +
  '• Graphing parabolas from vertex form and reading turning points.\n' +
  '• Most students showed clear working for factorisation when a = 1.\n\n' +
  'Focus for revision\n' +
  '• Double-check signs when you add/subtract both sides (small error → wrong roots).\n' +
  '• “Completing the square” — review Example 3 in the learning card pack.\n\n' +
  'Next step\n' +
  '• Optional drop-in Thursday 3:30–4:00 PM for targeted questions.';

/** Demo analytics shown in the class report modal (layout preview until gradebook is wired). */
export const REPORT_DEMO_GRADE_COUNTS = { hd: 5, d: 11, c: 9, p: 3 } as const;

export const REPORT_DEMO_LEARNING_CARD_OPENED = 22;

export const REPORT_DEMO_CLASS_SIZE = 28;

export const REPORT_DEMO_TOP_LEARNERS = [
  { name: 'Alex Wang', cardsOpened: 14 },
  { name: 'Betty Li', cardsOpened: 12 },
  { name: 'Carol Zhang', cardsOpened: 11 },
] as const;

export const PARENT_REPORT = [
  { label: 'Check-ins this week', value: '5/7 days', note: '+1 vs last week' },
  { label: 'Dominant mood', value: 'Okay', note: 'Tired on homework nights' },
  { label: 'Opened up', value: '2×', note: 'About math load' },
];

export const TEACHER_MOOD_ROWS = [
  ['Alex Wang', 'Okay', 'Mentioned homework length'],
  ['Betty Li', 'Calm', '—'],
  ['Carol Zhang', 'Stressed', 'Week before quiz'],
];

/** Teacher card preview — aligns with Knowledge TODO / DOING / DONE (mock only). */
export type TeacherCardEngagementStatus = 'todo' | 'doing' | 'done';

export type TeacherCardStudentEngagementRow = {
  id: string;
  name: string;
  status: TeacherCardEngagementStatus;
  /** How many suggested videos the student marked as watched (demo aggregate). */
  watchedVideos: number;
  /** When `status === 'done'`, matches Knowledge finish menu (demo). */
  finishedType?: LearningCardStudentFinishedType;
};

export type TeacherCardParentEngagementRow = {
  id: string;
  name: string;
  status: TeacherCardEngagementStatus;
  /** Whether this parent tapped “Need help” for this card (demo). */
  needHelp: boolean;
};

/** Mock: families (parent accounts) that used each suggested “tonight” action for this card — demo only. */
export type TeacherCardTonightActionUptakeMock = {
  quizFamilyCount: number;
  practiceFamilyCount: number;
  teachBackFamilyCount: number;
};

export type TeacherCardEngagementMock = {
  students: TeacherCardStudentEngagementRow[];
  parents: TeacherCardParentEngagementRow[];
  /** Suggested-action uptake; replace with aggregates from `studentFeedbacks` later. */
  tonightActionUptake: TeacherCardTonightActionUptakeMock;
};

/** Fixed roster for teacher card preview (names only; status/uptake come from `createTeacherEngagementMock`). */
const TEACHER_ENGAGEMENT_STUDENT_ROSTER: Array<{ id: string; name: string }> = [
  { id: 's1', name: 'Alex Wang' },
  { id: 's2', name: 'Betty Li' },
  { id: 's3', name: 'Carol Zhang' },
  { id: 's4', name: 'David Chen' },
  { id: 's5', name: 'Emma Liu' },
  { id: 's6', name: 'Frank Wu' },
  { id: 's7', name: 'Grace Huang' },
  { id: 's8', name: 'Henry Zhao' },
  { id: 's9', name: 'Iris Lin' },
  { id: 's10', name: 'Jack Ma' },
  { id: 's11', name: 'Kelly Zhou' },
  { id: 's12', name: 'Leo Sun' },
  { id: 's13', name: 'Mia Xu' },
  { id: 's14', name: 'Nina Gao' },
  { id: 's15', name: 'Oscar Tang' },
  { id: 's16', name: 'Penny Qian' },
  { id: 's17', name: 'Quinn Ren' },
  { id: 's18', name: 'Rachel Shen' },
  { id: 's19', name: 'Sam Ye' },
  { id: 's20', name: 'Tina Yu' },
  { id: 's21', name: 'Uma Jia' },
  { id: 's22', name: 'Victor He' },
  { id: 's23', name: 'Wendy Bai' },
  { id: 's24', name: 'Xander Cai' },
  { id: 's25', name: 'Yara Ding' },
  { id: 's26', name: 'Zara Fang' },
  { id: 's27', name: 'Aaron Guo' },
  { id: 's28', name: 'Bella Hu' },
  { id: 's29', name: 'Carl Jin' },
  { id: 's30', name: 'Dana Kong' },
];

const TEACHER_ENGAGEMENT_PARENT_ROSTER: Array<{
  id: string;
  name: string;
  status: TeacherCardEngagementStatus;
}> = [
  { id: 'p1', name: 'Ms. Wang', status: 'done' },
  { id: 'p2', name: 'Mr. Li', status: 'doing' },
  { id: 'p3', name: 'Ms. Zhang', status: 'todo' },
  { id: 'p4', name: 'Mr. Chen', status: 'todo' },
  { id: 'p5', name: 'Ms. Liu', status: 'doing' },
  { id: 'p6', name: 'Mr. Wu', status: 'done' },
  { id: 'p7', name: 'Ms. Huang', status: 'todo' },
  { id: 'p8', name: 'Mr. Zhao', status: 'doing' },
  { id: 'p9', name: 'Ms. Lin', status: 'done' },
  { id: 'p10', name: 'Mr. Ma', status: 'todo' },
  { id: 'p11', name: 'Ms. Zhou', status: 'doing' },
  { id: 'p12', name: 'Mr. Sun', status: 'done' },
  { id: 'p13', name: 'Ms. Xu', status: 'todo' },
  { id: 'p14', name: 'Mr. Gao', status: 'doing' },
  { id: 'p15', name: 'Ms. Tang', status: 'done' },
  { id: 'p16', name: 'Mr. Qian', status: 'todo' },
  { id: 'p17', name: 'Ms. Ren', status: 'doing' },
  { id: 'p18', name: 'Mr. Shen', status: 'done' },
  { id: 'p19', name: 'Ms. Ye', status: 'todo' },
  { id: 'p20', name: 'Mr. Yu', status: 'doing' },
  { id: 'p21', name: 'Ms. Jia', status: 'done' },
  { id: 'p22', name: 'Mr. He', status: 'todo' },
  { id: 'p23', name: 'Ms. Bai', status: 'doing' },
  { id: 'p24', name: 'Mr. Cai', status: 'done' },
  { id: 'p25', name: 'Ms. Ding', status: 'todo' },
  { id: 'p26', name: 'Mr. Fang', status: 'doing' },
  { id: 'p27', name: 'Ms. Guo', status: 'done' },
  { id: 'p28', name: 'Mr. Hu', status: 'todo' },
];

type TeacherEngagementVariantConfig = {
  splits: { todo: number; doing: number; done: number };
  uptake: TeacherCardTonightActionUptakeMock;
};

/** Several demo distributions so opening different cards does not always show the same charts. */
const TEACHER_ENGAGEMENT_VARIANTS: TeacherEngagementVariantConfig[] = [
  {
    splits: { todo: 10, doing: 9, done: 11 },
    uptake: { quizFamilyCount: 12, practiceFamilyCount: 8, teachBackFamilyCount: 3 },
  },
  {
    splits: { todo: 6, doing: 11, done: 13 },
    uptake: { quizFamilyCount: 20, practiceFamilyCount: 5, teachBackFamilyCount: 2 },
  },
  {
    splits: { todo: 14, doing: 8, done: 8 },
    uptake: { quizFamilyCount: 7, practiceFamilyCount: 14, teachBackFamilyCount: 4 },
  },
  {
    splits: { todo: 4, doing: 7, done: 19 },
    uptake: { quizFamilyCount: 16, practiceFamilyCount: 15, teachBackFamilyCount: 6 },
  },
  {
    splits: { todo: 18, doing: 9, done: 3 },
    uptake: { quizFamilyCount: 4, practiceFamilyCount: 6, teachBackFamilyCount: 1 },
  },
  {
    splits: { todo: 12, doing: 10, done: 8 },
    uptake: { quizFamilyCount: 10, practiceFamilyCount: 10, teachBackFamilyCount: 8 },
  },
];

const TEACHER_ENGAGEMENT_FINISHED_ROTATION: LearningCardStudentFinishedType[] = [
  'pretty_easy',
  'think_get_it',
  'challenge',
];

function createTeacherEngagementMock(variantIndex: number): TeacherCardEngagementMock {
  const nVariants = TEACHER_ENGAGEMENT_VARIANTS.length;
  const v = ((variantIndex % nVariants) + nVariants) % nVariants;
  const cfg = TEACHER_ENGAGEMENT_VARIANTS[v];
  const { todo, doing, done } = cfg.splits;
  const n = TEACHER_ENGAGEMENT_STUDENT_ROSTER.length;
  if (todo + doing + done !== n) {
    throw new Error(`Teacher engagement variant ${v}: splits must sum to ${n}`);
  }

  const students: TeacherCardStudentEngagementRow[] = TEACHER_ENGAGEMENT_STUDENT_ROSTER.map((row, i) => {
    let status: TeacherCardEngagementStatus;
    if (i < todo) status = 'todo';
    else if (i < todo + doing) status = 'doing';
    else status = 'done';
    const finishedType =
      status === 'done' ? TEACHER_ENGAGEMENT_FINISHED_ROTATION[(i + v) % TEACHER_ENGAGEMENT_FINISHED_ROTATION.length] : undefined;
    const watchedVideos =
      status === 'todo'
        ? (i + v) % 2
        : status === 'doing'
          ? 1 + ((i + v) % 3)
          : 2 + ((i + v) % 4);
    return { ...row, status, finishedType, watchedVideos };
  });

  const parents: TeacherCardParentEngagementRow[] = TEACHER_ENGAGEMENT_PARENT_ROSTER.map((row, i) => ({
    ...row,
    needHelp: (i + v * 2) % 7 === 0 || (i * 5 + v * 3) % 11 === 0,
  }));

  return {
    students,
    parents,
    tonightActionUptake: cfg.uptake,
  };
}

function hashCardIdToVariantIndex(cardId: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < cardId.length; i++) {
    h = (Math.imul(31, h) + cardId.charCodeAt(i)) >>> 0;
  }
  return modulo === 0 ? 0 : h % modulo;
}

/** How many mock distributions exist for `getMockTeacherCardEngagement` (stable per `cardId`). */
export const TEACHER_ENGAGEMENT_VARIANT_COUNT = TEACHER_ENGAGEMENT_VARIANTS.length;

/** Mock engagement for the teacher “open card” dialog. Swap for API-backed aggregates later. */
export function getMockTeacherCardEngagement(cardId: string): TeacherCardEngagementMock {
  return createTeacherEngagementMock(hashCardIdToVariantIndex(cardId, TEACHER_ENGAGEMENT_VARIANTS.length));
}
