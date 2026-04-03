import { getDataSourceMode } from './config';
import { ApiDataLayer } from './api/api-data-layer';
import { IndexedDbDataLayer } from './indexeddb/indexeddb-data-layer';
import type { DataLayer } from './repositories';

let singleton: DataLayer | null = null;

export function getDataLayer(): DataLayer {
  if (!singleton) {
    singleton = createDataLayer();
  }
  return singleton;
}

/** Creates a new instance (e.g. tests). Prefer `getDataLayer()` in the app. */
export function createDataLayer(): DataLayer {
  const mode = getDataSourceMode();
  if (mode === 'api') {
    return new ApiDataLayer();
  }
  return new IndexedDbDataLayer();
}
