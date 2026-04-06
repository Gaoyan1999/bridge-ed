/**
 * Backend contract for **class reports** (teacher-authored, pushed to Messages).
 * Audience is app-wide: not scoped to a class — “whole roster” is implied by `audience` flags.
 *
 * Conventions (aligned with `learning-card-backend.ts`):
 * - **Timestamps**: ISO 8601 strings in **UTC**.
 * - **IDs**: opaque strings (UUID recommended); thread keys may reuse `rep-<ms>` prefixes.
 * - **schemaVersion**: bump when migrating stored shapes.
 *
 * IndexedDB hints (suggested):
 * - Object store: `reports`, keyPath: `id`
 * - Indexes: `authorUserId`, `sentAt`, `createdAt`, `updatedAt`
 */

export const REPORT_SCHEMA_VERSION = 1 as const;

/**
 * One persisted report row — what you `put()` in IndexedDB / send to an API.
 */
export interface ReportBackend {
  id: string;
  schemaVersion: typeof REPORT_SCHEMA_VERSION;

  createdAt: string;
  updatedAt: string;

  /** Owner teacher (`UserBackend.id`, `role === 'teacher'`). */
  authorUserId: string;

  /** When the teacher completed “Send to Messages” (UTC). */
  sentAt: string;

  /** Report title shown in preview and inbox. */
  title: string;
  /** Summary line (blue strip in UI). */
  summary: string;
  /** Full body; newlines preserved. */
  body: string;

  /** Which Messages threads received the rich report (whole-system roster; no class id). */
  audience: {
    toStudents: boolean;
    toParents: boolean;
  };

  /**
   * Client thread keys after send (e.g. `rep-<ts>-s` / `rep-<ts>-p`) for syncing UI with storage.
   */
  messageThreadIds?: {
    student?: string;
    parent?: string;
  };
}
