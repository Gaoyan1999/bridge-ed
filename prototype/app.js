(function () {
  "use strict";

  const MODULES = ["dashboard", "ai", "chat", "mood"];
  const ROLES = ["parent", "student", "teacher"];
  const COLLAPSE_KEY = "bridgeed-sidebar-collapsed";

  const ROLE_DISPLAY = {
    parent: { emoji: "👪", label: "Parent" },
    student: { emoji: "👨‍🎓", label: "Student" },
    teacher: { emoji: "🧑‍🏫", label: "Teacher" },
  };

  const DASH_TODOS = [
    { id: "1", text: "Reply to Alex Wang’s parent booking request", done: false },
    { id: "2", text: "Review “Quadratic equations” card feedback (completion low)", done: false },
    { id: "3", text: "Draft next week’s quiz note", done: true },
  ];

  const DASH_PUBLISH = [
    { title: "This week: quadratics — solution strategies", date: "2026-04-01", meta: "Delivered · 92% read" },
    { title: "Holiday schedule update", date: "2026-03-28", meta: "Broadcast · whole class" },
  ];

  const DASH_STATS = [
    { label: "Card feedback rate", value: "78%" },
    { label: "Top struggle", value: "Factoring" },
    { label: "Parents to nudge", value: "3" },
  ];

  const DASH_STUDENTS = [
    { name: "Alex Wang", grade: "G9", parent: "Ms. Wang", feedback: "3/30 factoring" },
    { name: "Betty Li", grade: "G9", parent: "Mr. Li", feedback: "—" },
    { name: "Carol Zhang", grade: "G9", parent: "Ms. Zhang", feedback: "4/1 quiz worry" },
  ];

  const DASH_SCHEDULE = [
    { day: "Mon 4/1", items: ["4:00 PM dept meeting", "6:30 PM parent slot"] },
    { day: "Tue 4/2", items: ["After-school help"] },
    { day: "Wed 4/3", items: ["5:30 PM parent slot", "Grading"] },
    { day: "Thu 4/4", items: ["—"] },
    { day: "Fri 4/5", items: ["Quiz draft due"] },
  ];

  const PARENT_DASH_CARDS = [
    {
      id: "card-pythagoras",
      title: "Pythagorean theorem",
      subject: "Math · Geometry",
      status: "New",
      summary: "What right triangles have in common, and why a² + b² = c².",
      linkedDay: "Mon 4/1",
      threadId: "card-thread-pythagoras",
    },
    {
      id: "card-calculus",
      title: "What is calculus?",
      subject: "Math · Calculus",
      status: "In progress",
      summary: "Derivatives as “how fast something is changing” with everyday examples.",
      linkedDay: "Tue 4/2",
      threadId: "card-thread-calculus",
    },
    {
      id: "card-shakespeare",
      title: "Who is Shakespeare?",
      subject: "Literature",
      status: "Reviewed",
      summary: "Why we still read Shakespeare and how to help with reading at home.",
      linkedDay: "Thu 4/4",
      threadId: "card-thread-shakespeare",
    },
  ];

  const PARENT_DASH_TODOS = [
    {
      id: "pt1",
      text: "Ask your child to explain the Pythagorean theorem using a real object at home.",
    },
    {
      id: "pt2",
      text: "Pick one calculus graph from the textbook and talk about what is “changing”.",
    },
    {
      id: "pt3",
      text: "Read one Shakespeare speech together and underline unfamiliar words.",
    },
  ];

  const PARENT_DASH_SCHEDULE = [
    {
      day: "Mon 4/1",
      items: ["08:30 Math — Geometry", "10:00 English — Reading workshop", "Evening: homework check‑in"],
    },
    {
      day: "Tue 4/2",
      items: ["09:15 Math — Algebra", "13:30 Science", "After school: extra help available"],
    },
    {
      day: "Wed 4/3",
      items: ["08:30 English — Shakespeare", "10:45 History", "Evening: light review only"],
    },
    {
      day: "Thu 4/4",
      items: ["09:15 Math — Quiz review", "14:00 Art", "Evening: free reading"],
    },
    {
      day: "Fri 4/5",
      items: ["08:30 Math — Short quiz", "11:00 PE", "Weekend: optional practice set"],
    },
  ];

  const PARENT_DASH_MOOD = [
    { day: "Mon", emoji: "🙂", label: "Okay" },
    { day: "Tue", emoji: "😄", label: "Happy" },
    { day: "Wed", emoji: "😐", label: "Neutral" },
    { day: "Thu", emoji: "😕", label: "Tired" },
    { day: "Fri", emoji: "😄", label: "Excited" },
  ];

  const ROLE_COPY = {
    parent: {
      ai: "Ask about homework, definitions, or paste a teacher note to get clear next steps.",
      chat: "School notices, chat with the teacher, and book a one-to-one slot.",
      mood: "See your child’s weekly mood summary and trends.",
    },
    student: {
      ai: "Hints and practice ideas appear here (demo). Deeper tutoring stays on the parent view.",
      chat: "Class notices and messages from your teacher (demo).",
      mood: "Move the slider from very unpleasant to very pleasant, then tap Next to save your check-in.",
    },
    teacher: {
      dashboard: "Create class reports and push them to students and parents under Messages—plus tasks, posts, and your week.",
      ai: "Preview how AI might read to parents; publish through Messages and learning cards.",
      chat: "Broadcast to class or parents and manage booking requests.",
      mood: "Class mood overview alongside learning feedback.",
    },
  };

  const AI_DEMO = [
    {
      role: "user",
      text: 'What does the discriminant Δ mean in my child’s math homework? How do I explain it in plain language?',
    },
    {
      role: "ai",
      text:
        "You can say: Δ helps us see how many real roots the equation has.\n\n" +
        "Tonight, try this:\n" +
        "1. Write the equation in standard form ax²+bx+c=0 and read off a, b, c.\n" +
        "2. Compute Δ=b²−4ac. Sign only: positive → two roots, zero → one repeated root, negative → no real roots.\n" +
        "3. You don’t need the full formula tonight—practice spotting a, b, c first.",
    },
    {
      role: "user",
      text:
        "The weekly note says: class quiz average 72, my child 68, most points lost on factoring steps. What should we do next?",
    },
    {
      role: "ai",
      text:
        "Here are four next steps:\n\n" +
        "1. Together, circle every quiz item tagged “factoring” and redo only those.\n" +
        "2. Spend 10 minutes on the textbook example: rewrite a quadratic as (x−?)(x−?).\n" +
        "3. You don’t need to solve end-to-end—ask: “Is this step splitting into two brackets?”\n" +
        "4. If it’s still stuck after two nights, message the teacher with the question number and book a short check-in.",
    },
  ];

  const INBOX = {
    parent: [
      { id: "n1", title: "[Broadcast] Practice set: quadratics", date: "2026-04-01", kind: "broadcast" },
      { id: "n2", title: "Ms. Lee: note on next week’s quiz", date: "2026-03-30", kind: "dm" },
    ],
    student: [
      { id: "s1", title: "Class: submit homework by Friday", date: "2026-04-02", kind: "broadcast" },
    ],
    teacher: [
      { id: "t1", title: "Booking: Alex Wang’s parent", date: "2026-04-02", kind: "booking" },
      { id: "t2", title: "Draft: broadcast", date: "2026-04-01", kind: "draft" },
    ],
  };

  const THREADS = {
    n1: [
      {
        who: "School",
        type: "in",
        text: "This week’s factoring practice (PDF is in Materials). About 15 minutes a day is enough—you don’t need to finish it in one go.",
      },
    ],
    n2: [
      {
        who: "Ms. Lee",
        type: "in",
        text: "Next week’s quiz focuses on variations of the in-class examples. If your child gets stuck on a step, send the question number.",
      },
      { who: "You", type: "out", text: "Thanks—we’ll focus on example 3 this weekend." },
    ],
    s1: [
      { who: "Homeroom", type: "in", text: "Submit math homework by Friday; format is in the class announcement." },
    ],
    t1: [
      {
        who: "System",
        type: "in",
        text: "Booking request: Wed 5:30–5:50 PM, topic “factoring homework” (Alex Wang’s parent).",
      },
    ],
    t2: [
      { who: "You", type: "in", text: "Draft not sent yet. Open Broadcast to continue editing." },
    ],
  };

  const REPORT_DRAFT_TITLE = "Week 14 — class progress snapshot";
  const REPORT_DRAFT_BODY =
    "Hello everyone,\n\n" +
    "Here’s a quick snapshot of our week in Algebra 9:\n" +
    "• We wrapped quadratic equations with emphasis on factoring.\n" +
    "• Most of the class is on track; a few students should redo the practice set on factoring signs.\n" +
    "• Next week: short quiz on Tuesday — review examples 1–3 from the textbook.\n\n" +
    "Reach out if you’d like a short check-in.\n\n" +
    "— Ms. Lee";

  function pushTeacherReport(title, body, toStudents, toParents) {
    const dateStr = new Date().toISOString().slice(0, 10);
    const baseId = "rep-" + Date.now();
    const trimmed = body.trim();
    const excerpt = trimmed.length > 600 ? trimmed.slice(0, 600) + "…" : trimmed;
    const threadLine = {
      who: "Ms. Lee",
      type: "in",
      text: excerpt,
    };

    if (toStudents) {
      const sid = baseId + "-s";
      INBOX.student.unshift({
        id: sid,
        title: "[Report] " + title,
        date: dateStr,
        kind: "report",
      });
      THREADS[sid] = [threadLine];
    }
    if (toParents) {
      const pid = baseId + "-p";
      INBOX.parent.unshift({
        id: pid,
        title: "[Report] " + title,
        date: dateStr,
        kind: "report",
      });
      THREADS[pid] = [{ who: threadLine.who, type: threadLine.type, text: threadLine.text }];
    }
  }

  const PARENT_REPORT = [
    { label: "Check-ins this week", value: "5/7 days", note: "+1 vs last week" },
    { label: "Dominant mood", value: "Okay", note: "Tired on homework nights" },
    { label: "Opened up", value: "2×", note: "About math load" },
  ];

  const TEACHER_MOOD_ROWS = [
    ["Alex Wang", "Okay", "Mentioned homework length"],
    ["Betty Li", "Calm", "—"],
    ["Carol Zhang", "Stressed", "Week before quiz"],
  ];

  let currentRole = "parent";
  let currentModule = "ai";
  let selectedInboxId = null;

  const el = (sel, root) => (root || document).querySelector(sel);
  const els = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function applySidebarCollapsed(collapsed) {
    const app = el("[data-app]");
    const btn = el("#sidebar-collapse");
    if (!app) return;
    app.classList.toggle("app--sidebar-collapsed", collapsed);
    if (btn) {
      btn.setAttribute("aria-expanded", String(!collapsed));
      btn.setAttribute("title", collapsed ? "Expand sidebar" : "Collapse sidebar");
    }
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch (e) {
      /* ignore */
    }
  }

  function setSidebarOpen(open) {
    const app = el("[data-app]");
    const toggle = el("#sidebar-toggle");
    const backdrop = el("#sidebar-backdrop");
    if (!app || !toggle) return;
    app.classList.toggle("sidebar-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (backdrop) {
      backdrop.hidden = !open;
      backdrop.classList.toggle("is-open", open);
    }
  }

  function showModal(id, body) {
    const modal = el(id);
    if (!modal) return;
    if (body) {
      const b = el("#modal-generic-body");
      const t = el("#modal-generic-title");
      if (b && body.body) b.textContent = body.body;
      if (t && body.title) t.textContent = body.title;
    }
    modal.hidden = false;
    const closeBtn = modal.querySelector("[data-close-modal]");
    (closeBtn || modal).focus?.();
  }

  function hideModal(modalEl) {
    if (modalEl) modalEl.hidden = true;
  }

  function updateRoleDropdownUI(role) {
    const meta = ROLE_DISPLAY[role];
    if (!meta) return;
    const emojiEl = el("#role-dropdown-emoji");
    const nameEl = el("#role-dropdown-name");
    const trigger = el("#role-dropdown-trigger");
    if (emojiEl) emojiEl.textContent = meta.emoji;
    if (nameEl) nameEl.textContent = meta.label;
    if (trigger) trigger.setAttribute("aria-label", "View as " + meta.label);
    els(".role-dropdown__option").forEach((opt) => {
      const is = opt.getAttribute("data-role") === role;
      opt.setAttribute("aria-selected", String(is));
      opt.classList.toggle("is-active", is);
    });
  }

  function closeRoleDropdown() {
    const dd = el("#role-dropdown");
    const menu = el("#role-dropdown-menu");
    const trig = el("#role-dropdown-trigger");
    if (dd) dd.classList.remove("is-open");
    if (menu) menu.hidden = true;
    if (trig) trig.setAttribute("aria-expanded", "false");
  }

  function openRoleDropdown() {
    const dd = el("#role-dropdown");
    const menu = el("#role-dropdown-menu");
    const trig = el("#role-dropdown-trigger");
    if (dd) dd.classList.add("is-open");
    if (menu) menu.hidden = false;
    if (trig) trig.setAttribute("aria-expanded", "true");
  }

  function toggleRoleDropdown() {
    const menu = el("#role-dropdown-menu");
    if (menu && menu.hidden) openRoleDropdown();
    else closeRoleDropdown();
  }

  function renderHints() {
    const c = ROLE_COPY[currentRole];
    const aiH = el("#ai-role-hint");
    const chH = el("#chat-role-hint");
    const mH = el("#mood-role-hint");
    const dashH = el("#panel-dashboard .panel__hint");
    if (aiH) aiH.textContent = c.ai;
    if (chH) chH.textContent = c.chat;
    if (mH) mH.textContent = c.mood;
    if (dashH && currentRole === "teacher") dashH.textContent = ROLE_COPY.teacher.dashboard;
  }

  function setRole(role) {
    if (!ROLES.includes(role)) return;
    currentRole = role;
    updateRoleDropdownUI(role);
    closeRoleDropdown();

    const navDash = el("#nav-dashboard");
    if (navDash) navDash.hidden = role === "student";

    if (role === "teacher" || role === "parent") {
      showModule("dashboard");
    } else if (currentModule === "dashboard") {
      showModule("ai");
    }

    renderHints();
    renderMoodSection();
    renderChatModule();
    const broadcastBtn = el("#btn-broadcast");
    const bookBtn = el("#btn-book-teacher");
    if (broadcastBtn) broadcastBtn.hidden = currentRole !== "teacher";
    if (bookBtn) bookBtn.hidden = currentRole !== "parent";
  }

  function showModule(mod) {
    if (!MODULES.includes(mod)) mod = "ai";
    currentModule = mod;
    els("[data-panel]").forEach((panel) => {
      const is = panel.getAttribute("data-panel") === mod;
      panel.classList.toggle("is-visible", is);
      panel.hidden = !is;
    });
    els(".nav-item").forEach((a) => {
      if (a.hidden) return;
      const is = a.getAttribute("data-module") === mod;
      a.classList.toggle("is-active", is);
    });
    if (history.replaceState) {
      history.replaceState(null, "", "#" + mod);
    }
    if (mod === "dashboard") renderDashboard();
    if (mod === "mood") renderMoodSection();
  }

  function renderTeacherDashboard() {
    const todoEl = el("#dash-todo-list");
    if (todoEl) {
      todoEl.innerHTML = "";
      DASH_TODOS.forEach((t) => {
        const li = document.createElement("li");
        const id = "todo-" + t.id;
        li.innerHTML =
          "<input type=\"checkbox\" id=\"" +
          id +
          "\" " +
          (t.done ? "checked" : "") +
          " disabled />" +
          "<label for=\"" +
          id +
          "\">" +
          escapeHtml(t.text) +
          "</label>";
        todoEl.appendChild(li);
      });
    }

    const pubEl = el("#dash-publish-list");
    if (pubEl) {
      pubEl.innerHTML = "";
      DASH_PUBLISH.forEach((p) => {
        const li = document.createElement("li");
        li.innerHTML =
          "<strong>" +
          escapeHtml(p.title) +
          "</strong><span>" +
          escapeHtml(p.date) +
          " · " +
          escapeHtml(p.meta) +
          "</span>";
        pubEl.appendChild(li);
      });
    }

    const statsEl = el("#dash-stats");
    if (statsEl) {
      statsEl.innerHTML = "";
      DASH_STATS.forEach((s) => {
        const div = document.createElement("div");
        div.className = "stat-pill";
        div.innerHTML =
          "<div class=\"stat-pill__value\">" +
          escapeHtml(s.value) +
          "</div>" +
          "<div class=\"stat-pill__label\">" +
          escapeHtml(s.label) +
          "</div>";
        statsEl.appendChild(div);
      });
    }

    const tbody = el("#dash-students-body");
    if (tbody) {
      tbody.innerHTML = "";
      DASH_STUDENTS.forEach((s) => {
        const tr = document.createElement("tr");
        tr.setAttribute("data-name", s.name.toLowerCase());
        tr.innerHTML =
          "<td>" +
          escapeHtml(s.name) +
          "</td><td>" +
          escapeHtml(s.grade) +
          "</td><td>" +
          escapeHtml(s.parent) +
          "</td><td>" +
          escapeHtml(s.feedback) +
          "</td><td><button type=\"button\" class=\"btn btn--text btn--sm dash-row-action\">View</button></td>";
        tbody.appendChild(tr);
      });
    }

    const schedEl = el("#dash-schedule");
    if (schedEl) {
      schedEl.innerHTML = "";
      DASH_SCHEDULE.forEach((d) => {
        const box = document.createElement("div");
        box.className = "schedule-day";
        const ul = d.items.map((i) => "<li>" + escapeHtml(i) + "</li>").join("");
        box.innerHTML =
          "<div class=\"schedule-day__name\">" +
          escapeHtml(d.day) +
          "</div><ul>" +
          ul +
          "</ul>";
        schedEl.appendChild(box);
      });
    }

    const cardsWrap = el("#teacher-cards");
    if (cardsWrap) {
      cardsWrap.innerHTML = "";
      PARENT_DASH_CARDS.forEach((c) => {
        const div = document.createElement("button");
        div.type = "button";
        div.className = "parent-card";
        div.setAttribute("data-thread-id", c.threadId);
        div.innerHTML =
          "<h4 class=\"parent-card__title\">" +
          escapeHtml(c.title) +
          "</h4>" +
          "<div class=\"parent-card__meta\">" +
          "<span class=\"parent-card__subject-pill\">" +
          escapeHtml(c.subject) +
          "</span>" +
          "<span class=\"parent-card__status\">" +
          escapeHtml(c.status) +
          "</span>" +
          "</div>" +
          "<p class=\"parent-card__summary\">" +
          escapeHtml(c.summary) +
          "</p>" +
          "<div class=\"parent-card__footer\">" +
          "<span class=\"parent-card__cta\">Open parent view</span>" +
          (c.linkedDay
            ? "<span class=\"parent-card__linked\">Linked to " + escapeHtml(c.linkedDay) + "</span>"
            : "") +
          "</div>";
        div.addEventListener("click", () => openCardThreadFromDashboard(c));
        cardsWrap.appendChild(div);
      });
    }
  }

  function renderParentDashboard() {
    const teacherGrid = el("#teacher-dashboard");
    const parentGrid = el("#parent-dashboard");
    if (teacherGrid) teacherGrid.hidden = true;
    if (parentGrid) parentGrid.hidden = false;

    const cardsWrap = el("#parent-cards");
    if (cardsWrap) {
      cardsWrap.innerHTML = "";
      PARENT_DASH_CARDS.forEach((c) => {
        const div = document.createElement("button");
        div.type = "button";
        div.className = "parent-card";
        div.setAttribute("data-thread-id", c.threadId);
        div.innerHTML =
          "<h4 class=\"parent-card__title\">" +
          escapeHtml(c.title) +
          "</h4>" +
          "<div class=\"parent-card__meta\">" +
          "<span class=\"parent-card__subject-pill\">" +
          escapeHtml(c.subject) +
          "</span>" +
          "<span class=\"parent-card__status\">" +
          escapeHtml(c.status) +
          "</span>" +
          "</div>" +
          "<p class=\"parent-card__summary\">" +
          escapeHtml(c.summary) +
          "</p>" +
          "<div class=\"parent-card__footer\">" +
          "<span class=\"parent-card__cta\">Open in Messages</span>" +
          (c.linkedDay
            ? "<span class=\"parent-card__linked\">Linked to " + escapeHtml(c.linkedDay) + "</span>"
            : "") +
          "</div>";
        div.addEventListener("click", () => openCardThreadFromDashboard(c));
        cardsWrap.appendChild(div);
      });
    }

    const schedEl = el("#parent-schedule");
    if (schedEl) {
      schedEl.innerHTML = "";
      PARENT_DASH_SCHEDULE.forEach((d) => {
        const box = document.createElement("div");
        box.className = "schedule-day";
        const ul = d.items.map((i) => "<li>" + escapeHtml(i) + "</li>").join("");
        box.innerHTML =
          "<div class=\"schedule-day__name\">" +
          escapeHtml(d.day) +
          "</div><ul>" +
          ul +
          "</ul>";
        schedEl.appendChild(box);
      });
    }

    const moodGrid = el("#parent-mood-grid");
    if (moodGrid) {
      moodGrid.innerHTML = "";
      PARENT_DASH_MOOD.forEach((m) => {
        const cell = document.createElement("div");
        cell.className = "parent-mood-day";
        cell.innerHTML =
          "<span class=\"parent-mood-day__date\">" +
          escapeHtml(m.day) +
          "</span>" +
          "<span class=\"parent-mood-day__emoji\" aria-hidden=\"true\">" +
          escapeHtml(m.emoji) +
          "</span>" +
          "<span class=\"parent-mood-day__label\">" +
          escapeHtml(m.label) +
          "</span>";
        moodGrid.appendChild(cell);
      });
    }

    const teacherGrid2 = el("#teacher-dashboard");
    if (teacherGrid2) teacherGrid2.hidden = true;
  }

  function renderDashboard() {
    const teacherGrid = el("#teacher-dashboard");
    const parentGrid = el("#parent-dashboard");
    if (currentRole === "teacher") {
      if (teacherGrid) teacherGrid.hidden = false;
      if (parentGrid) parentGrid.hidden = true;
      renderTeacherDashboard();
    } else if (currentRole === "parent") {
      renderParentDashboard();
    }
  }

  function filterDashboardStudents(q) {
    const query = (q || "").trim().toLowerCase();
    els("#dash-students-body tr").forEach((tr) => {
      const name = tr.getAttribute("data-name") || "";
      tr.hidden = query.length > 0 && !name.includes(query);
    });
  }

  function openCardThreadFromDashboard(card) {
    const id = card.threadId;
    const dateStr = new Date().toISOString().slice(0, 10);
    if (!THREADS[id]) {
      const body =
        card.summary +
        "\n\n" +
        "In this card we:\n" +
        "• Explain the idea in parent‑friendly language.\n" +
        "• Suggest 1–2 materials to use at home.\n" +
        "• List a short plan for tonight or this week.\n\n" +
        "(Demo content only.)";
      THREADS[id] = [
        {
          who: "BridgeEd",
          type: "in",
          text: body,
        },
      ];
    }
    if (!INBOX.parent.some((m) => m.id === id)) {
      INBOX.parent.unshift({
        id,
        title: "[Card] " + card.title,
        date: dateStr,
        kind: "card",
      });
    }
    currentRole = "parent";
    updateRoleDropdownUI("parent");
    showModule("chat");
    selectedInboxId = id;
    renderChatModule();
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function appendBubble(role, text) {
    const thread = el("#ai-thread");
    if (!thread) return;
    const div = document.createElement("div");
    div.className = "bubble " + (role === "user" ? "bubble--user" : "bubble--ai");
    const meta = document.createElement("div");
    meta.className = "bubble__meta";
    meta.textContent = role === "user" ? "You" : "BridgeEd AI";
    const body = document.createElement("div");
    body.className = "numbered";
    body.innerHTML = escapeHtml(text).replace(/\n/g, "<br />");
    div.appendChild(meta);
    div.appendChild(body);
    thread.appendChild(div);
    thread.scrollTop = thread.scrollHeight;
  }

  function loadAiDemo() {
    const thread = el("#ai-thread");
    if (!thread) return;
    thread.innerHTML = "";
    AI_DEMO.forEach((m) => appendBubble(m.role === "user" ? "user" : "ai", m.text));
  }

  function renderChatModule() {
    const list = el("#inbox-list");
    const items = INBOX[currentRole] || INBOX.parent;
    if (!list) return;
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = "<p class=\"panel__hint\" style=\"padding:1rem\">No messages yet.</p>";
      return;
    }
    if (!selectedInboxId || !items.some((i) => i.id === selectedInboxId)) {
      selectedInboxId = items[0].id;
    }
    items.forEach((item) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "inbox-item" + (item.id === selectedInboxId ? " is-active" : "");
      b.setAttribute("data-id", item.id);
      b.innerHTML =
        "<div class=\"inbox-item__title\">" +
        escapeHtml(item.title) +
        "</div>" +
        "<div class=\"inbox-item__meta\">" +
        escapeHtml(item.date) +
        "</div>";
      b.addEventListener("click", () => {
        selectedInboxId = item.id;
        renderChatModule();
      });
      list.appendChild(b);
    });

    const title = el("#thread-title");
    const thread = el("#msg-thread");
    const cur = items.find((i) => i.id === selectedInboxId);
    if (title && cur) title.textContent = cur.title;
    if (thread) {
      thread.innerHTML = "";
      const msgs = THREADS[selectedInboxId] || [];
      msgs.forEach((m) => {
        const d = document.createElement("div");
        d.className = "msg msg--" + (m.type === "out" ? "out" : "in");
        d.innerHTML =
          "<div class=\"msg__who\">" +
          escapeHtml(m.who) +
          "</div>" +
          "<div>" +
          escapeHtml(m.text) +
          "</div>";
        thread.appendChild(d);
      });
      if (msgs.length === 0) {
        thread.innerHTML = "<p class=\"panel__hint\">No messages in this thread (demo).</p>";
      }
    }

    const input = el("#chat-input");
    const succRole = currentRole === "parent" ? "You" : currentRole === "teacher" ? "You" : "You";
    if (input) {
      input.value = "";
      input.placeholder =
        currentRole === "parent"
          ? "Type a message to your teacher…"
          : currentRole === "teacher"
          ? "Type a message to this family or class…"
          : "Type a message…";
    }
  }

  function moodSpectrumLabel(v) {
    const n = Number(v);
    if (n <= 15) return "Very unpleasant";
    if (n <= 35) return "Unpleasant";
    if (n <= 65) return "Neutral";
    if (n <= 85) return "Pleasant";
    return "Very pleasant";
  }

  function updateEmotionFromSlider() {
    const slider = el("#mood-slider");
    const label = el("#emotion-label");
    const ripple = el("#emotion-ripple");
    const screen = el("#emotion-screen");
    if (!slider) return;
    const val = Number(slider.value);
    const t = val / 100;
    const text = moodSpectrumLabel(val);
    if (label) label.textContent = text;
    slider.setAttribute("aria-valuetext", text);
    if (ripple) ripple.style.setProperty("--pleasant", String(t));
    if (screen) screen.style.setProperty("--pleasant", String(t));
  }

  function initEmotionScreen() {
    const screen = el("#emotion-screen");
    if (screen && screen.dataset.emotionBound !== "1") {
      screen.dataset.emotionBound = "1";
      el("#mood-slider")?.addEventListener("input", updateEmotionFromSlider);
      el("#mood-emotion-back")?.addEventListener("click", () => showModule("ai"));
      el("#mood-emotion-close")?.addEventListener("click", () => showModule("ai"));
    }
    updateEmotionFromSlider();
  }

  function renderParentReport() {
    const wrap = el("#parent-mood-report");
    if (!wrap) return;
    wrap.innerHTML = "";
    PARENT_REPORT.forEach((r) => {
      const card = document.createElement("div");
      card.className = "report-card";
      card.innerHTML =
        "<div class=\"report-card__label\">" +
        escapeHtml(r.label) +
        "</div>" +
        "<div class=\"report-card__value\">" +
        escapeHtml(r.value) +
        "</div>" +
        "<p class=\"report-card__note\">" +
        escapeHtml(r.note) +
        "</p>";
      wrap.appendChild(card);
    });
  }

  function renderTeacherTable() {
    const tbody = document.querySelector("#teacher-mood-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    TEACHER_MOOD_ROWS.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = row.map((c) => "<td>" + escapeHtml(c) + "</td>").join("");
      tbody.appendChild(tr);
    });
  }

  function renderMoodSection() {
    const st = el("#mood-student");
    const pa = el("#mood-parent");
    const te = el("#mood-teacher");
    const panel = el("#panel-mood");
    const ph = el("#mood-panel-header");
    if (!st || !pa || !te) return;
    st.hidden = currentRole !== "student";
    pa.hidden = currentRole !== "parent";
    te.hidden = currentRole !== "teacher";
    if (panel) panel.classList.toggle("panel--student-fill", currentRole === "student");
    if (ph) ph.hidden = currentRole === "student";
    if (currentRole === "student") {
      const slider = el("#mood-slider");
      if (slider) slider.value = "50";
      const note = el("#mood-note");
      if (note) note.value = "";
      initEmotionScreen();
      const succ = el("#mood-success");
      if (succ) succ.hidden = true;
    }
    if (currentRole === "parent") renderParentReport();
    if (currentRole === "teacher") renderTeacherTable();
  }

  function onHashChange() {
    let h = (location.hash || "#dashboard").slice(1).toLowerCase();
    if (!MODULES.includes(h)) h = "dashboard";
    showModule(h);
  }

  function init() {
    els(".nav-item").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        if (a.hidden) return;
        const mod = a.getAttribute("data-module");
        if (mod) {
          showModule(mod);
          setSidebarOpen(false);
        }
      });
    });

    el("#sidebar-collapse")?.addEventListener("click", () => {
      const app = el("[data-app]");
      if (!app) return;
      applySidebarCollapsed(!app.classList.contains("app--sidebar-collapsed"));
    });

    try {
      applySidebarCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch (e) {
      applySidebarCollapsed(false);
    }

    const onCreateCardClick = () => {
      showModal("#modal-generic", {
        title: "New learning card",
        body:
          "Demo flow: enter class notes → generate parent summary and tonight’s actions → preview & edit → pick audience (class or selected parents) → send. Matches the teacher “publish learning card” flow in UI/UX-Flows.",
      });
    };

    el("#btn-new-learning-card")?.addEventListener("click", onCreateCardClick);
    el("#btn-teacher-create-card")?.addEventListener("click", onCreateCardClick);

    function resetReportModal() {
      const form = el("#form-report");
      const succ = el("#report-success");
      const hint = el("#report-audience-hint");
      if (form) {
        form.hidden = false;
        form.reset();
      }
      if (succ) succ.hidden = true;
      if (hint) hint.hidden = true;
      const ts = el("#report-to-students");
      const tp = el("#report-to-parents");
      if (ts) ts.checked = true;
      if (tp) tp.checked = true;
    }

    el("#btn-open-report-modal")?.addEventListener("click", () => {
      resetReportModal();
      const modal = el("#modal-report");
      if (modal) modal.hidden = false;
    });

    el("#btn-report-draft")?.addEventListener("click", () => {
      const ti = el("#report-title");
      const bd = el("#report-body");
      if (ti) ti.value = REPORT_DRAFT_TITLE;
      if (bd) bd.value = REPORT_DRAFT_BODY;
    });

    el("#form-report")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const toS = el("#report-to-students");
      const toP = el("#report-to-parents");
      const toStudents = toS && toS.checked;
      const toParents = toP && toP.checked;
      const hint = el("#report-audience-hint");
      if (!toStudents && !toParents) {
        if (hint) hint.hidden = false;
        return;
      }
      if (hint) hint.hidden = true;
      const titleEl = el("#report-title");
      const bodyEl = el("#report-body");
      const title = (titleEl && titleEl.value.trim()) || "Untitled report";
      const body = (bodyEl && bodyEl.value.trim()) || "";
      pushTeacherReport(title, body, toStudents, toParents);
      const form = el("#form-report");
      const succ = el("#report-success");
      if (form) form.hidden = true;
      if (succ) succ.hidden = false;
    });

    el("#student-filter")?.addEventListener("input", (e) => {
      filterDashboardStudents(e.target.value);
    });

    document.getElementById("dash-students-body")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".dash-row-action");
      if (!btn) return;
      showModal("#modal-generic", {
        title: "Student detail",
        body: "Demo: contact info, past learning-card feedback, and booking history would appear here.",
      });
    });

    el("#role-dropdown-trigger")?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleRoleDropdown();
    });

    els(".role-dropdown__option").forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        const r = opt.getAttribute("data-role");
        if (r) setRole(r);
      });
    });

    document.addEventListener("mousedown", (e) => {
      const dd = el("#role-dropdown");
      if (!dd || !dd.classList.contains("is-open")) return;
      if (!dd.contains(e.target)) closeRoleDropdown();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const dd = el("#role-dropdown");
      if (dd && dd.classList.contains("is-open")) {
        closeRoleDropdown();
        el("#role-dropdown-trigger")?.focus();
      }
    });

    const toggle = el("#sidebar-toggle");
    const backdrop = el("#sidebar-backdrop");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const app = el("[data-app]");
        setSidebarOpen(!app.classList.contains("sidebar-open"));
      });
    }
    if (backdrop) {
      backdrop.addEventListener("click", () => setSidebarOpen(false));
    }

    el("#ai-load-demo")?.addEventListener("click", loadAiDemo);

    el("#ai-send")?.addEventListener("click", () => {
      const input = el("#ai-input");
      const v = (input && input.value.trim()) || "";
      if (!v) return;
      appendBubble("user", v);
      input.value = "";
      setTimeout(() => {
        appendBubble(
          "ai",
          "(Demo) Got it. In production, replies follow your school’s rules and safety policies. Add grade level or textbook if you want tighter help."
        );
      }, 400);
    });

    el("#btn-book-teacher")?.addEventListener("click", () => {
      const modal = el("#modal-book");
      const form = el("#form-book");
      const succ = el("#book-success");
      if (succ) succ.hidden = true;
      if (form) {
        form.hidden = false;
        form.reset();
      }
      if (modal) modal.hidden = false;
    });

    el("#form-book")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const form = el("#form-book");
      const succ = el("#book-success");
      if (form) form.hidden = true;
      if (succ) succ.hidden = false;
    });

    el("#btn-broadcast")?.addEventListener("click", () => {
      const modal = el("#modal-broadcast");
      const succ = el("#bc-success");
      const form = el("#form-broadcast");
      if (succ) succ.hidden = true;
      if (form) {
        form.hidden = false;
        form.reset();
      }
      if (modal) modal.hidden = false;
    });

    el("#form-broadcast")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const form = el("#form-broadcast");
      const succ = el("#bc-success");
      if (form) form.hidden = true;
      if (succ) succ.hidden = false;
    });

    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const modal = btn.closest(".modal");
        hideModal(modal);
        if (modal && modal.id === "modal-book") {
          const form = el("#form-book");
          const succ = el("#book-success");
          if (form) {
            form.hidden = false;
            form.reset();
          }
          if (succ) succ.hidden = true;
        }
        if (modal && modal.id === "modal-broadcast") {
          const form = el("#form-broadcast");
          const succ = el("#bc-success");
          if (form) {
            form.hidden = false;
            form.reset();
          }
          if (succ) succ.hidden = true;
        }
        if (modal && modal.id === "modal-report") {
          resetReportModal();
        }
      });
    });

    function toolMsg(title, body) {
      showModal("#modal-generic", { title, body });
    }

    el("#tool-upload")?.addEventListener("click", () =>
      toolMsg(
        "Upload report",
        "Demo: upload weekly notes, report cards, or PDFs so the AI can reference them in chat."
      )
    );
    el("#tool-practice")?.addEventListener("click", () =>
      toolMsg(
        "Generate practice",
        "Demo: create 2–3 short items from the current learning-card topic for the student to try."
      )
    );
    el("#tool-snippets")?.addEventListener("click", () =>
      toolMsg(
        "Quick phrases",
        'Demo: one-tap inserts like “Explain shorter” or “Give a real-life example” into the composer.'
      )
    );

    el("#mood-submit")?.addEventListener("click", () => {
      const succ = el("#mood-success");
      if (succ) succ.hidden = false;
    });

    el("#chat-send")?.addEventListener("click", () => {
      const input = el("#chat-input");
      const v = (input && input.value.trim()) || "";
      if (!v) return;
      const id = selectedInboxId;
      if (!id) return;
      const thread = THREADS[id] || [];
      thread.push({ who: "You", type: "out", text: v });
      THREADS[id] = thread;
      renderChatModule();
    });

    window.addEventListener("hashchange", onHashChange);

    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      document.querySelectorAll(".modal:not([hidden])").forEach((modal) => {
        hideModal(modal);
        if (modal.id === "modal-book") {
          const form = el("#form-book");
          const succ = el("#book-success");
          if (form) {
            form.hidden = false;
            form.reset();
          }
          if (succ) succ.hidden = true;
        }
        if (modal.id === "modal-broadcast") {
          const form = el("#form-broadcast");
          const succ = el("#bc-success");
          if (form) {
            form.hidden = false;
            form.reset();
          }
          if (succ) succ.hidden = true;
        }
        if (modal.id === "modal-report") {
          resetReportModal();
        }
      });
    });

    setRole("parent");
    onHashChange();
    loadAiDemo();
    renderChatModule();
    renderMoodSection();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
