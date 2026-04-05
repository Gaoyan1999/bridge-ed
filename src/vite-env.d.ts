/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `indexeddb` (default) — local Dexie / IndexedDB. `api` — HTTP backend. */
  readonly VITE_DATA_SOURCE?: 'indexeddb' | 'api';
  /** Base URL for REST API when `VITE_DATA_SOURCE=api`, e.g. `http://localhost:8787` */
  readonly VITE_API_BASE_URL?: string;
  /** When `true` or `1`, show debug-only UI (e.g. delete on learning card tiles). */
  readonly VITE_DEBUG?: string;
  /** When `true` or `1`, learning-card parent summary calls the backend LLM; otherwise a local mock is used. */
  readonly VITE_USE_LLM?: string;
}
