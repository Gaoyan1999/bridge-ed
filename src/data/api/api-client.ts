import { getApiBaseUrl } from '../config';

export class ApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(message: string, status: number, path: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
  }
}

export async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error('VITE_API_BASE_URL is not set. Set it when VITE_DATA_SOURCE=api.');
  }
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(text || res.statusText, res.status, path);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const ct = res.headers.get('content-type');
  if (!ct?.includes('application/json')) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
