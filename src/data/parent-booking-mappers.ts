import { PARENT_BOOKING_SCHEMA_VERSION, type ParentBookingBackend } from './entity/parent-booking-backend';

export function normalizeParentBookingBackend(raw: ParentBookingBackend): ParentBookingBackend {
  return {
    ...raw,
    schemaVersion: PARENT_BOOKING_SCHEMA_VERSION,
    topic: typeof raw.topic === 'string' ? raw.topic : '',
    bookSlot: String(raw.bookSlot ?? ''),
    date: String(raw.date ?? ''),
  };
}
