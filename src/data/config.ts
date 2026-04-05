export type DataSourceMode = 'indexeddb' | 'api';

export function getDataSourceMode(): DataSourceMode {
  const v = import.meta.env.VITE_DATA_SOURCE;
  if (v === 'api') return 'api';
  return 'indexeddb';
}

/** Normalized API origin, no trailing slash. */
export function getApiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  return base.replace(/\/$/, '');
}

/**
 * Dev-only affordances (e.g. delete on learning card tiles). Set in `.env`:
 * `VITE_DEBUG=true` or `VITE_DEBUG=1`.
 */
export function getDebugMode(): boolean {
  const v = import.meta.env.VITE_DEBUG;
  return v === 'true' || v === '1';
}

/**
 * When true, `LlmApi.explainTerminologyToParents` calls the backend. When false (default), uses a local mock
 * to avoid token spend. Set in `.env`: `VITE_USE_LLM=true`.
 */
export function getUseLlm(): boolean {
  const v = import.meta.env.VITE_USE_LLM;
  return v === 'true' || v === '1';
}
