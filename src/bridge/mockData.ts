import type { LearningCardStudentFinishedType } from '@/data/entity/learning-card-backend';
import type { StudentMoodKind } from '@/data/entity/student-mood-backend';
import type { InboxItem, LearningCardItem, ParentMoodChildProfile, Role, ScheduleDay, ThreadMessage } from './types';
import { normalizeTonightActions } from '@/data/learning-card-mappers';

/** Demo fixtures: teacher “tonight” presets (IndexedDB import uses full `LearningCardItem`). */
const DEMO_TONIGHT_ALL = normalizeTonightActions([]);

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

/** Parent dashboard demo cards — also used to build IndexedDB import fixtures. */
export const PARENT_DASH_CARDS_RAW: LearningCardItem[] = [
  {
    grade: '',
    id: 'card-pythagoras',
    title: 'Pythagorean theorem',
    subject: 'Math · Geometry',
    summary: 'What right triangles have in common, and why a² + b² = c².',
    at: Date.parse('2026-04-01T09:30:00'),
    threadId: 'card-thread-pythagoras',
    tonightActions: DEMO_TONIGHT_ALL,
  },
  {
    grade: '',
    id: 'card-calculus',
    title: 'What is calculus?',
    subject: 'Math · Calculus',
    summary: 'Derivatives as “how fast something is changing” with everyday examples.',
    at: Date.parse('2026-04-02T11:00:00'),
    threadId: 'card-thread-calculus',
    tonightActions: DEMO_TONIGHT_ALL,
  },
  {
    grade: '',
    id: 'card-fractions',
    title: 'What is a fraction?',
    subject: 'Math · Arithmetic',
    summary: 'Parts of a whole in plain language—numerator, denominator, and a pizza-slice mental model.',
    at: Date.parse('2026-04-03T16:45:00'),
    threadId: 'card-thread-fractions',
    tonightActions: DEMO_TONIGHT_ALL,
  },
  {
    grade: '',
    id: 'card-shakespeare',
    title: 'Who is Shakespeare?',
    subject: 'Literature',
    summary: 'Why we still read Shakespeare and how to help with reading at home.',
    at: Date.parse('2026-04-04T10:15:00'),
    threadId: 'card-thread-shakespeare',
    tonightActions: DEMO_TONIGHT_ALL,
  },
  {
    grade: '',
    id: 'card-atmospheric-pressure',
    title: 'What is atmospheric pressure?',
    subject: 'Science',
    summary: 'Air pushes on everything around us; how we feel it and a simple “column of air” picture.',
    at: Date.parse('2026-04-05T08:20:00'),
    threadId: 'card-thread-atmospheric-pressure',
    tonightActions: DEMO_TONIGHT_ALL,
  },
  {
    grade: '',
    id: 'card-water-cycle',
    title: 'What is the water cycle?',
    subject: 'Science · Earth',
    summary: 'Evaporation, clouds, and rain in one easy loop—no jargon overload.',
    at: Date.parse('2026-04-06T13:00:00'),
    threadId: 'card-thread-water-cycle',
    tonightActions: DEMO_TONIGHT_ALL,
  },
  {
    grade: '',
    id: 'card-quadratic-equations',
    title: 'Quadratic equations in standard form',
    subject: 'Math · Algebra',
    summary: 'From ax² + bx + c = 0 to factoring and the quadratic formula—when to use which.',
    at: Date.parse('2026-04-07T09:00:00'),
    threadId: 'card-thread-quadratic-equations',
    tonightActions: DEMO_TONIGHT_ALL,
  },
  {
    grade: '',
    id: 'card-photosynthesis',
    title: 'What is photosynthesis?',
    subject: 'Science · Biology',
    summary: 'How plants turn light, water, and CO₂ into sugar and oxygen—simple words, one diagram.',
    at: Date.parse('2026-04-07T15:30:00'),
    threadId: 'card-thread-photosynthesis',
    tonightActions: DEMO_TONIGHT_ALL,
  },
  {
    grade: '',
    id: 'card-metaphor',
    title: 'What is a metaphor?',
    subject: 'English · Writing',
    summary: 'Not literal comparison—how metaphors work in poems and everyday speech.',
    at: Date.parse('2026-04-08T10:20:00'),
    threadId: 'card-thread-metaphor',
    tonightActions: DEMO_TONIGHT_ALL,
  },
  {
    grade: '',
    id: 'card-periodic-table',
    title: 'Reading the periodic table',
    subject: 'Science · Chemistry',
    summary: 'Groups, periods, and atomic number—why the table’s shape is not random.',
    at: Date.parse('2026-04-09T08:45:00'),
    threadId: 'card-thread-periodic-table',
    tonightActions: DEMO_TONIGHT_ALL,
  },
  {
    grade: '',
    id: 'card-linear-graphs',
    title: 'Linear functions on a graph',
    subject: 'Math · Algebra',
    summary: 'Slope and y-intercept in context: “rise over run” without the stress.',
    at: Date.parse('2026-04-09T14:10:00'),
    threadId: 'card-thread-linear-graphs',
    tonightActions: DEMO_TONIGHT_ALL,
  },
  {
    grade: '',
    id: 'card-civil-war',
    title: 'The U.S. Civil War — big picture',
    subject: 'History · U.S.',
    summary: 'Causes, turning points, and why we study it—without a 50-name quiz.',
    at: Date.parse('2026-04-10T11:00:00'),
    threadId: 'card-thread-civil-war',
    tonightActions: DEMO_TONIGHT_ALL,
  },
  {
    grade: '',
    id: 'card-cells',
    title: 'Plant vs animal cells',
    subject: 'Science · Biology',
    summary: 'Cell wall, chloroplasts, nucleus—what to remember for the diagram label sheet.',
    at: Date.parse('2026-04-11T09:50:00'),
    threadId: 'card-thread-cells',
    tonightActions: DEMO_TONIGHT_ALL,
  },
  {
    grade: '',
    id: 'card-persuasive-essay',
    title: 'Building a persuasive paragraph',
    subject: 'English',
    summary: 'Claim, evidence, reasoning—one paragraph at a time before the full essay.',
    at: Date.parse('2026-04-12T16:00:00'),
    threadId: 'card-thread-persuasive-essay',
    tonightActions: DEMO_TONIGHT_ALL,
  },
  {
    grade: '',
    id: 'card-renaissance',
    title: 'What was the Renaissance?',
    subject: 'History · World',
    summary: 'Art, ideas, and “rebirth”—how to talk about it at dinner without a textbook tone.',
    at: Date.parse('2026-04-13T10:05:00'),
    threadId: 'card-thread-renaissance',
    tonightActions: DEMO_TONIGHT_ALL,
  },
  {
    grade: '',
    id: 'card-probability',
    title: 'Probability in everyday situations',
    subject: 'Math · Statistics',
    summary: 'Simple events, “and” vs “or,” and why a coin flip is still 50–50.',
    at: Date.parse('2026-04-14T13:25:00'),
    threadId: 'card-thread-probability',
    tonightActions: DEMO_TONIGHT_ALL,
  },
  {
    grade: '',
    id: 'card-constitution',
    title: 'The Constitution — three branches',
    subject: 'History · Civics',
    summary: 'Legislative, executive, judicial—checks and balances in one page.',
    at: Date.parse('2026-04-15T08:15:00'),
    threadId: 'card-thread-constitution',
    tonightActions: DEMO_TONIGHT_ALL,
  },
  {
    grade: '',
    id: 'card-art-perspective',
    title: 'One-point perspective in drawing',
    subject: 'Art',
    summary: 'Horizon line and vanishing point—why hallways “feel” deep on paper.',
    at: Date.parse('2026-04-16T14:40:00'),
    threadId: 'card-thread-art-perspective',
    tonightActions: DEMO_TONIGHT_ALL,
  },
];

/** Newest first (by `at`). */
export const PARENT_DASH_CARDS: LearningCardItem[] = [...PARENT_DASH_CARDS_RAW].sort((a, b) => b.at - a.at);

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
  parent: [
    { id: 'n1', title: '[Broadcast] Practice set: quadratics', date: '2026-04-01', kind: 'broadcast' },
    { id: 'n2', title: 'Ms. Lee: note on next week’s quiz', date: '2026-03-30', kind: 'dm' },
  ],
  student: [{ id: 's1', title: 'Class: submit homework by Friday', date: '2026-04-02', kind: 'broadcast' }],
  teacher: [
    { id: 't1', title: 'Booking: Alex Wang’s parent', date: '2026-04-02', kind: 'booking' },
    { id: 't2', title: 'Draft: broadcast', date: '2026-04-01', kind: 'draft' },
  ],
};

export const INITIAL_THREADS: Record<string, ThreadMessage[]> = {
  n1: [
    {
      who: 'School',
      type: 'in',
      text: 'This week’s factoring practice (PDF is in Materials). About 15 minutes a day is enough—you don’t need to finish it in one go.',
    },
  ],
  n2: [
    {
      who: 'Ms. Lee',
      type: 'in',
      text: 'Next week’s quiz focuses on variations of the in-class examples. If your child gets stuck on a step, send the question number.',
    },
    { who: 'You', type: 'out', text: 'Thanks—we’ll focus on example 3 this weekend.' },
  ],
  s1: [
    {
      who: 'Homeroom',
      type: 'in',
      text: 'Submit math homework by Friday; format is in the class announcement.',
    },
  ],
  t1: [
    {
      who: 'System',
      type: 'in',
      text: 'Booking request: Wed 5:30–5:50 PM, topic “factoring homework” (Alex Wang’s parent).',
    },
  ],
  t2: [{ who: 'You', type: 'in', text: 'Draft not sent yet. Open Broadcast to continue editing.' }],
};

export const REPORT_DRAFT_TITLE = 'Week 14 — class progress snapshot';
export const REPORT_DRAFT_BODY =
  'Hello everyone,\n\n' +
  'Here’s a quick snapshot of our week in Algebra 9:\n' +
  '• We wrapped quadratic equations with emphasis on factoring.\n' +
  '• Most of the class is on track; a few students should redo the practice set on factoring signs.\n' +
  '• Next week: short quiz on Tuesday — review examples 1–3 from the textbook.\n\n' +
  'Reach out if you’d like a short check-in.\n\n' +
  '— Ms. Lee';

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

export type TeacherCardEngagementMock = {
  students: TeacherCardStudentEngagementRow[];
  parents: TeacherCardParentEngagementRow[];
};

const MOCK_ENGAGEMENT_BASE: TeacherCardEngagementMock = {
  students: [
    { id: 's1', name: 'Alex Wang', status: 'todo', watchedVideos: 0 },
    { id: 's2', name: 'Betty Li', status: 'todo', watchedVideos: 1 },
    { id: 's3', name: 'Carol Zhang', status: 'todo', watchedVideos: 0 },
    { id: 's4', name: 'David Chen', status: 'todo', watchedVideos: 1 },
    { id: 's5', name: 'Emma Liu', status: 'todo', watchedVideos: 0 },
    { id: 's6', name: 'Frank Wu', status: 'todo', watchedVideos: 0 },
    { id: 's7', name: 'Grace Huang', status: 'todo', watchedVideos: 1 },
    { id: 's8', name: 'Henry Zhao', status: 'todo', watchedVideos: 0 },
    { id: 's9', name: 'Iris Lin', status: 'todo', watchedVideos: 0 },
    { id: 's10', name: 'Jack Ma', status: 'doing', watchedVideos: 1 },
    { id: 's11', name: 'Kelly Zhou', status: 'doing', watchedVideos: 2 },
    { id: 's12', name: 'Leo Sun', status: 'doing', watchedVideos: 1 },
    { id: 's13', name: 'Mia Xu', status: 'doing', watchedVideos: 2 },
    { id: 's14', name: 'Nina Gao', status: 'doing', watchedVideos: 1 },
    { id: 's15', name: 'Oscar Tang', status: 'doing', watchedVideos: 2 },
    { id: 's16', name: 'Penny Qian', status: 'doing', watchedVideos: 1 },
    { id: 's17', name: 'Quinn Ren', status: 'doing', watchedVideos: 2 },
    { id: 's18', name: 'Rachel Shen', status: 'doing', watchedVideos: 1 },
    { id: 's19', name: 'Sam Ye', status: 'doing', watchedVideos: 2 },
    { id: 's20', name: 'Tina Yu', status: 'done', watchedVideos: 3, finishedType: 'pretty_easy' },
    { id: 's21', name: 'Uma Jia', status: 'done', watchedVideos: 2, finishedType: 'think_get_it' },
    { id: 's22', name: 'Victor He', status: 'done', watchedVideos: 4, finishedType: 'challenge' },
    { id: 's23', name: 'Wendy Bai', status: 'done', watchedVideos: 3, finishedType: 'pretty_easy' },
    { id: 's24', name: 'Xander Cai', status: 'done', watchedVideos: 2, finishedType: 'think_get_it' },
    { id: 's25', name: 'Yara Ding', status: 'done', watchedVideos: 3, finishedType: 'pretty_easy' },
    { id: 's26', name: 'Zara Fang', status: 'done', watchedVideos: 4, finishedType: 'think_get_it' },
    { id: 's27', name: 'Aaron Guo', status: 'done', watchedVideos: 2, finishedType: 'challenge' },
    { id: 's28', name: 'Bella Hu', status: 'done', watchedVideos: 3, finishedType: 'pretty_easy' },
    { id: 's29', name: 'Carl Jin', status: 'done', watchedVideos: 2, finishedType: 'think_get_it' },
    { id: 's30', name: 'Dana Kong', status: 'done', watchedVideos: 3, finishedType: 'pretty_easy' },
  ],
  parents: [
    { id: 'p1', name: 'Ms. Wang', status: 'done', needHelp: false },
    { id: 'p2', name: 'Mr. Li', status: 'doing', needHelp: false },
    { id: 'p3', name: 'Ms. Zhang', status: 'todo', needHelp: true },
    { id: 'p4', name: 'Mr. Chen', status: 'todo', needHelp: false },
    { id: 'p5', name: 'Ms. Liu', status: 'doing', needHelp: false },
    { id: 'p6', name: 'Mr. Wu', status: 'done', needHelp: false },
    { id: 'p7', name: 'Ms. Huang', status: 'todo', needHelp: false },
    { id: 'p8', name: 'Mr. Zhao', status: 'doing', needHelp: true },
    { id: 'p9', name: 'Ms. Lin', status: 'done', needHelp: false },
    { id: 'p10', name: 'Mr. Ma', status: 'todo', needHelp: false },
    { id: 'p11', name: 'Ms. Zhou', status: 'doing', needHelp: false },
    { id: 'p12', name: 'Mr. Sun', status: 'done', needHelp: false },
    { id: 'p13', name: 'Ms. Xu', status: 'todo', needHelp: false },
    { id: 'p14', name: 'Mr. Gao', status: 'doing', needHelp: false },
    { id: 'p15', name: 'Ms. Tang', status: 'done', needHelp: true },
    { id: 'p16', name: 'Mr. Qian', status: 'todo', needHelp: false },
    { id: 'p17', name: 'Ms. Ren', status: 'doing', needHelp: false },
    { id: 'p18', name: 'Mr. Shen', status: 'done', needHelp: false },
    { id: 'p19', name: 'Ms. Ye', status: 'todo', needHelp: false },
    { id: 'p20', name: 'Mr. Yu', status: 'doing', needHelp: false },
    { id: 'p21', name: 'Ms. Jia', status: 'done', needHelp: false },
    { id: 'p22', name: 'Mr. He', status: 'todo', needHelp: true },
    { id: 'p23', name: 'Ms. Bai', status: 'doing', needHelp: false },
    { id: 'p24', name: 'Mr. Cai', status: 'done', needHelp: false },
    { id: 'p25', name: 'Ms. Ding', status: 'todo', needHelp: false },
    { id: 'p26', name: 'Mr. Fang', status: 'doing', needHelp: false },
    { id: 'p27', name: 'Ms. Guo', status: 'done', needHelp: false },
    { id: 'p28', name: 'Mr. Hu', status: 'todo', needHelp: false },
  ],
};

/** Mock engagement for the teacher “open card” dialog. Swap for API-backed aggregates later. */
export function getMockTeacherCardEngagement(_cardId: string): TeacherCardEngagementMock {
  void _cardId;
  return MOCK_ENGAGEMENT_BASE;
}
