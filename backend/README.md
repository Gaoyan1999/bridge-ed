# BridgeEd Backend

FastAPI backend for the BridgeEd hackathon prototype.

This repo now uses the Python/FastAPI backend path only.

## What it does

- Stores learning cards in a local JSON file
- Exposes REST endpoints for the existing frontend data layer
- Adds a `POST /learning-cards/generate` endpoint for CurricuLLM-powered draft generation
- Falls back to demo output when CurricuLLM credentials are missing or the request fails

## Install

```bash
pip install -r backend/requirements.txt
```

## Run

From the repo root:

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8787
```

Or use:

```bash
pnpm run dev:backend
```

The server listens on `http://localhost:8787` by default.

## Frontend env

Set these for the Vite app:

```bash
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=http://localhost:8787
```

## Backend env

Create `backend/.env` from [`backend/.env.example`](./.env.example).

Required for real CurricuLLM calls:

- `CURRICULLM_API_URL`
- `CURRICULLM_API_KEY`

## Endpoints

- `GET /health`
- `GET /learning-cards`
- `GET /learning-cards/{id}`
- `POST /learning-cards`
- `PUT /learning-cards/{id}`
- `DELETE /learning-cards/{id}`
- `POST /learning-cards/generate`
