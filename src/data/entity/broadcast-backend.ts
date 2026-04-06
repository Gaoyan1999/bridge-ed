/**
 * Backend contract for **class broadcasts** (teacher-authored announcements pushed to Messages).
 * Simpler than {@link ReportBackend}: no graded “summary” strip — just a title and body.
 *
 * Conventions (aligned with `report-backend.ts` / `learning-card-backend.ts`):
 * - **Timestamps**: ISO 8601 strings in **UTC**.
 * - **IDs**: opaque strings (UUID recommended); thread keys may use `bc-<ms>`-style prefixes.
 * - **schemaVersion**: bump when migrating stored shapes.
 *
 * IndexedDB hints (suggested):
 * - Object store: `broadcasts`, keyPath: `id`
 * - Indexes: `authorUserId`, `sentAt`, `createdAt`, `updatedAt`
 */

export const BROADCAST_SCHEMA_VERSION = 1 as const;

/**
 * One persisted broadcast row — what you `put()` in IndexedDB / send to an API.
 */
export interface BroadcastBackend {
  id: string;
  schemaVersion: typeof BROADCAST_SCHEMA_VERSION;

  createdAt: string;
  updatedAt: string;

  /** Owner teacher (`UserBackend.id`, `role === 'teacher'`). */
  authorUserId: string;

  /** When the teacher completed “Send to class” (UTC). */
  sentAt: string;

  /** Shown in inbox and thread header. */
  title: string;
  /** Full message; newlines preserved. */
  body: string;

  /** Which Messages inboxes received the broadcast (same semantics as class reports). */
  audience: {
    toStudents: boolean;
    toParents: boolean;
  };

  /**
   * Client thread keys after send (e.g. `bc-<ts>-s` / `bc-<ts>-p`) for syncing UI with storage.
   */
  messageThreadIds?: {
    student?: string;
    parent?: string;
  };
}
