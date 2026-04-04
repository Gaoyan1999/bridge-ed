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
