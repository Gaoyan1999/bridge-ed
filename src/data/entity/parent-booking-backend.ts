/**
 * Parent-initiated 1:1 booking requests (IndexedDB / future API).
 * - **Timestamps**: ISO 8601 UTC strings.
 * - **date**: Preferred local calendar day `YYYY-MM-DD` (same as date input).
 * - **bookSlot**: `1600` | `1730` | `1800` (see Bridge booking modal).
 */

export const PARENT_BOOKING_SCHEMA_VERSION = 1 as const;

export type ParentBookingBackend = {
  id: string;
  schemaVersion: typeof PARENT_BOOKING_SCHEMA_VERSION;

  createdAt: string;
  updatedAt: string;

  parentId: string;
  studentId: string;
  teacherId: string;

  /** Preferred date (YYYY-MM-DD). */
  date: string;
  /** e.g. `1600`, `1730`, `1800`. */
  bookSlot: string;
  topic: string;

  status: 'pending' | 'confirmed' | 'cancelled';

  /** Set when `status === 'confirmed'` — shared DM thread for parent + teacher. */
  messageThreadId?: string;
};
