# BridgeEd

A React + Vite prototype for the school–home collaboration shell (Bridge workspace).

## Requirements

- **Node.js**: Use a current **LTS** release (for example 20.x or 22.x).
- **Package manager**: This repo uses **pnpm**.
- **Python 3** with `pip`: needed for the optional FastAPI backend (AI + API data layer).

## Installing pnpm

In a terminal, run:

```bash
pnpm --version
```

If the command is not found, install pnpm using one of these options:

1. **Corepack** (bundled with Node 16.13+, recommended)

   ```bash
   corepack enable
   corepack prepare pnpm@latest --activate
   ```

2. **npm global install**

   ```bash
   npm install -g pnpm
   ```

For other install methods, see the [pnpm installation docs](https://pnpm.io/installation).

## Getting started (local dev)

### 1. Configure two `.env` files

Templates committed in git (not ignored): [`.env.example`](./.env.example) and [`backend/.env.example`](./backend/.env.example).

- **Root `.env`** — copy from `.env.example`. Vite reads this (`VITE_DATA_SOURCE`, `VITE_API_BASE_URL`, `VITE_DEBUG`, …). Restart `pnpm dev` after edits.
- **`backend/.env`** — copy from `backend/.env.example` and set `CURRICULLM_API_KEY` (and URL/model if needed) for live AI from the API. You can skip real keys if you only use demo fallbacks.

Do **not** commit the actual `.env` or `backend/.env` files (only the `*.example` files are tracked).

### 2. Start the backend

One-time installs from the repo root:

```bash
pnpm install

# Install Python dependencies for the backend
pip install -r backend/requirements.txt
# or, if you use pip3:
pip3 install -r backend/requirements.txt
```


Then run the API (default **http://localhost:8787**):

```bash
pnpm run dev:backend
```

### 3. Start the frontend

In another terminal:

```bash
pnpm dev
```

Open the URL shown in the terminal (usually **http://localhost:5173**). It should match `VITE_API_BASE_URL` in your root `.env` if you use API + AI.

### 4. (Optional) Import `reference/data.json` on the Debug page

To seed **IndexedDB** with sample users, learning cards, moods, etc.:

1. Go to **http://localhost:5173/debug** (Debug — IndexedDB).
2. Click **Import JSON** and select [`reference/data.json`](./reference/data.json) from this repository.
3. Reload the app so lists update.

Skip this if an empty DB is fine or you use another data source.

