<!-- Banner image: hackathon.png in the repo root (same folder as this README). -->
<div align="center">

![2026 Oceania EduX Hackathon — Cambridge EdTech Society × InCubed](hackathon.png)

</div>

# BridgeEd

**From classroom to home — one collaborative loop.**

AI-assisted school–home workspace for hackathon demos: teachers publish learning cards, families get parent-friendly guidance, and structured feedback closes the loop — powered by **CurricuLLM** for curriculum-aligned generation.

---

## The problem

School–home communication often breaks down in predictable ways:

- **Language & jargon** — Updates sound like “teacher-speak”; parents are unsure what to *do* at home.
- **One-way broadcasts** — Information goes out, but actionable follow-up and light-touch feedback are hard to collect.
- **Teacher time** — Writing parent-friendly explanations and follow-ups can take far longer than the lesson itself.
- **Fragmented tools** — Chat, portals, and homework apps rarely connect “what we taught” with “what happens at home” in one place.

**Core tension:** How do we turn what teachers publish into what families can *execute*, without adding heavy admin burden — and still get signal back to the teacher?

---

## The solution

BridgeEd is a **three-role workspace** for **teacher · parent · student**:

- **Learning cards** — Teachers draft and share goals; content can be shaped into parent-facing summaries and next steps, with curriculum-aligned AI where you enable it.
- **Parent hub** — Clear “what to do tonight,” help when something is unclear, and structured responses back to school.
- **Student touchpoint** — Lightweight practice and mood / understanding signals that roll up to teacher views.
- **Flexible rollout** — Self-contained demo with sample data, or connect live curriculum AI when you are ready.

Together, these pieces tell a **2–3 minute demo story**: *publish → act at home → reflect → teacher sees the pulse.*

---

## What makes BridgeEd different

| Angle | BridgeEd (prototype) | Typical portal / chat-only tools |
| --- | --- | --- |
| Curriculum-aware drafts | CurricuLLM hook for generation & tutoring-style flows | Generic LLM or no AI |
| Closed loop | Learning cards + structured feedback + student signals | Messages only, or homework with no parent bridge |
| Teacher load | Designed for **short** publish paths (hackathon MVP) | Often long forms or many clicks |
| Local-first demo | IndexedDB + importable seed data | Often needs cloud day one |

---

## Tech stack

| Layer | Choice |
| --- | --- |
| **Frontend** | React 19 · TypeScript · Vite · Tailwind CSS · i18next |
| **Client data** | Dexie (IndexedDB) · pluggable API data layer |
| **Backend** | FastAPI (Python) · JSON file storage · CurricuLLM integration |
| **AI** | CurricuLLM API (with demo fallbacks when keys are absent) |

---

## Getting started

### Prerequisites

- **Node.js** — Current **LTS** (for example 20.x or 22.x)
- **pnpm** — This repo uses `pnpm` ([install pnpm](https://pnpm.io/installation))
- **Python 3** + `pip` — For the FastAPI backend

### 1. Install dependencies

From the repo root:

```bash
pnpm install
pip install -r backend/requirements.txt
# or: pip3 install -r backend/requirements.txt
```

### 2. Configure environment

Templates: [`.env.example`](./.env.example) and [`backend/.env.example`](./backend/.env.example).

- **Root `.env`** — Copy from `.env.example`. Vite reads `VITE_DATA_SOURCE`, `VITE_API_BASE_URL`, `VITE_USE_LLM`, etc. Restart `pnpm dev` after changes.
- **`backend/.env`** — Copy from `backend/.env.example` and set `CURRICULLM_API_KEY` (and URL/model if required) for live AI.

Do **not** commit real `.env` files (only `*.example` are tracked).

### 3. Run the backend (optional)

Default in `.env.example`: API at **http://localhost:8788**

```bash
pnpm run dev:backend
```

### 4. Run the frontend

```bash
pnpm dev
```

Open the URL from the terminal (usually **http://localhost:5173**). Ensure `VITE_API_BASE_URL` matches your backend port when using API mode.

### 5. (Optional) Seed IndexedDB

For demo users, learning cards, moods, and related data:

1. Open **http://localhost:5173/debug**
2. **Import JSON** → choose [`reference/data.json`](./reference/data.json)
3. Reload the app

---

## Backend API (overview)

| Area | Examples |
| --- | --- |
| Health | `GET /health` |
| Learning cards | `GET/POST /learning-cards`, `GET/PATCH/DELETE /learning-cards/{id}` |
| AI | `POST /learning-cards/generate`, chat & quiz helpers (see `backend/main.py`) |

See [`backend/README.md`](./backend/README.md) for endpoint-focused notes.

---

## Environment variables (quick reference)

| Variable | Role |
| --- | --- |
| `VITE_DATA_SOURCE` | `indexeddb` or `api` |
| `VITE_API_BASE_URL` | Backend origin (e.g. `http://localhost:8788`) |
| `VITE_USE_LLM` | Use backend for parent-summary generation when `true` |
| `CURRICULLM_API_KEY` | CurricuLLM API key (backend) |

Full lists live in the `*.example` files.

---

## License

Hackathon / educational prototype — use and adapt for demos and learning.


