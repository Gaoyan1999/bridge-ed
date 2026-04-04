import { useCallback, useState } from 'react';
import {
  exportIndexedDbSnapshot,
  importIndexedDbSnapshotFullReplace,
} from '@/data/indexeddb/snapshot';

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DebugIndexedDbPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onExport = useCallback(async () => {
    setBusy(true);
    setStatus(null);
    try {
      const snapshot = await exportIndexedDbSnapshot();
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadJson(`bridge-ed-indexeddb-${stamp}.json`, snapshot);
      setStatus(
        `Exported ${snapshot.learningCards.length} learning card(s), ${snapshot.studentMoods.length} mood row(s), ${snapshot.users.length} user(s).`,
      );
    } catch (e) {
      console.error(e);
      setStatus(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  }, []);

  const onPickFile = useCallback(
    async (fileList: FileList | null) => {
      const file = fileList?.[0];
      if (!file) return;
      setBusy(true);
      setStatus(null);
      try {
        const text = await file.text();
        const data: unknown = JSON.parse(text);
        await importIndexedDbSnapshotFullReplace(data);
        setStatus(`Imported successfully. Reload the app to refresh lists.`);
      } catch (e) {
        console.error(e);
        setStatus(e instanceof Error ? e.message : 'Import failed.');
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-auto p-6"
      style={{ background: 'var(--page-bg)', fontFamily: 'var(--font)' }}
    >
      <div className="mx-auto w-full max-w-xl space-y-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-soft)]">
        <header className="space-y-2">
          <h1 className="text-xl font-semibold text-[var(--text)]">Debug — IndexedDB</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Export the local <code className="rounded bg-[var(--pill-bg)] px-1 py-0.5 text-xs">bridge-ed</code>{' '}
            database as one JSON file. Import clears all stores, then writes the snapshot (full replace).
          </p>
        </header>

        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => void onExport()}>
            Export JSON
          </button>
          <label className="btn btn--secondary btn--sm cursor-pointer">
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              disabled={busy}
              onChange={(e) => void onPickFile(e.target.files)}
            />
            Import JSON
          </label>
          <a href="/" className="btn btn--ghost btn--sm no-underline">
            Back to app
          </a>
        </div>

        {status && (
          <p className="text-sm text-[var(--text-muted)]" role="status">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
