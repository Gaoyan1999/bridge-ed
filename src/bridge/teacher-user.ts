import type { ParentBookingBackend } from '@/data/entity/parent-booking-backend';
import type { UserBackend } from '@/data/entity/user-backend';

export function resolveTeacherAuthorId(users: UserBackend[], currentUserId: string | null): string {
  if (currentUserId) {
    const u = users.find((x) => x.id === currentUserId);
    if (u?.role === 'teacher') return u.id;
  }
  return users.find((u) => u.role === 'teacher')?.id ?? 'teacher-1';
}

export function bookingTargetsTeacher(booking: ParentBookingBackend, teacherId: string): boolean {
  if (booking.teacherId === teacherId) return true;
  if (teacherId === 'teacher-1' && booking.teacherId === '1') return true;
  return false;
}
