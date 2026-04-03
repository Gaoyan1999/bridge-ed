import type { InboxItem, LearningCardItem, MoodDay, Role, ScheduleDay, ThreadMessage } from './types';

export const MODULES = ['dashboard', 'ai', 'chat', 'mood'] as const;

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

export const DASH_SCHEDULE: ScheduleDay[] = [
  { day: 'Mon 4/1', items: ['4:00 PM dept meeting', '6:30 PM parent slot'] },
  { day: 'Tue 4/2', items: ['After-school help'] },
  { day: 'Wed 4/3', items: ['5:30 PM parent slot', 'Grading'] },
  { day: 'Thu 4/4', items: ['—'] },
  { day: 'Fri 4/5', items: ['Quiz draft due'] },
];

export const PARENT_DASH_CARDS: LearningCardItem[] = [
  {
    id: 'card-pythagoras',
    title: 'Pythagorean theorem',
    subject: 'Math · Geometry',
    status: 'New',
    summary: 'What right triangles have in common, and why a² + b² = c².',
    linkedDay: 'Mon 4/1',
    threadId: 'card-thread-pythagoras',
  },
  {
    id: 'card-calculus',
    title: 'What is calculus?',
    subject: 'Math · Calculus',
    status: 'In progress',
    summary: 'Derivatives as “how fast something is changing” with everyday examples.',
    linkedDay: 'Tue 4/2',
    threadId: 'card-thread-calculus',
  },
  {
    id: 'card-shakespeare',
    title: 'Who is Shakespeare?',
    subject: 'Literature',
    status: 'Reviewed',
    summary: 'Why we still read Shakespeare and how to help with reading at home.',
    linkedDay: 'Thu 4/4',
    threadId: 'card-thread-shakespeare',
  },
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

export const PARENT_DASH_MOOD: MoodDay[] = [
  { day: 'Mon', emoji: '🙂', label: 'Okay' },
  { day: 'Tue', emoji: '😄', label: 'Happy' },
  { day: 'Wed', emoji: '😐', label: 'Neutral' },
  { day: 'Thu', emoji: '😕', label: 'Tired' },
  { day: 'Fri', emoji: '😄', label: 'Excited' },
];

export const ROLE_COPY: Record<
  string,
  { dashboard?: string; ai: string; chat: string; mood: string }
> = {
  parent: {
    ai: 'Ask about homework, definitions, or paste a teacher note to get clear next steps.',
    chat: 'School notices, chat with the teacher, and book a one-to-one slot.',
    mood: 'See your child’s weekly mood summary and trends.',
  },
  student: {
    ai: 'Hints and practice ideas appear here (demo). Deeper tutoring stays on the parent view.',
    chat: 'Class notices and messages from your teacher (demo).',
    mood: 'Move the slider from very unpleasant to very pleasant, then tap Next to save your check-in.',
  },
  teacher: {
    dashboard:
      'Create class reports and push them to students and parents under Messages—plus tasks, posts, and your week.',
    ai: 'Preview how AI might read to parents; publish through Messages and learning cards.',
    chat: 'Broadcast to class or parents and manage booking requests.',
    mood: 'Class mood overview alongside learning feedback.',
  },
};

export const AI_DEMO = [
  {
    role: 'user' as const,
    text: 'What does the discriminant Δ mean in my child’s math homework? How do I explain it in plain language?',
  },
  {
    role: 'ai' as const,
    text:
      'You can say: Δ helps us see how many real roots the equation has.\n\n' +
      'Tonight, try this:\n' +
      '1. Write the equation in standard form ax²+bx+c=0 and read off a, b, c.\n' +
      '2. Compute Δ=b²−4ac. Sign only: positive → two roots, zero → one repeated root, negative → no real roots.\n' +
      '3. You don’t need the full formula tonight—practice spotting a, b, c first.',
  },
  {
    role: 'user' as const,
    text:
      'The weekly note says: class quiz average 72, my child 68, most points lost on factoring steps. What should we do next?',
  },
  {
    role: 'ai' as const,
    text:
      'Here are four next steps:\n\n' +
      '1. Together, circle every quiz item tagged “factoring” and redo only those.\n' +
      '2. Spend 10 minutes on the textbook example: rewrite a quadratic as (x−?)(x−?).\n' +
      '3. You don’t need to solve end-to-end—ask: “Is this step splitting into two brackets?”\n' +
      '4. If it’s still stuck after two nights, message the teacher with the question number and book a short check-in.',
  },
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
