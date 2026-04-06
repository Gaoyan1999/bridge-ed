import type { ThreadMessage } from '@/bridge/types';
import { bookingSlotLabel } from '@/bridge/parent-booking-slot';
import type { ParentBookingBackend } from '@/data/entity/parent-booking-backend';
import type { UserBackend } from '@/data/entity/user-backend';

export function threadMessageFromParentBooking(booking: ParentBookingBackend, users: UserBackend[]): ThreadMessage {
  const parent = users.find((u) => u.id === booking.parentId);
  const student = users.find((u) => u.id === booking.studentId);
  const parentDisplay = parent?.name ?? booking.parentId;
  const studentDisplay = student?.name ?? booking.studentId;
  const topic = booking.topic.trim();
  return {
    who: 'System',
    type: 'in',
    text: '',
    bookingDetail: {
      bookingId: booking.id,
      parentDisplay,
      studentDisplay,
      topic: topic || '—',
      date: booking.date,
      slotLabel: bookingSlotLabel(booking.bookSlot),
      slotValue: booking.bookSlot,
    },
  };
}
