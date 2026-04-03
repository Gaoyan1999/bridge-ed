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
