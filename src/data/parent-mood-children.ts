import type { ParentMoodChildProfile } from '@/bridge/types';
import type { UserBackend } from './entity/user-backend';

/**
 * Build parent mood week rows from `UserBackend` records (parent `children` → student `name`).
 */
export function parentMoodChildrenFromUsers(users: UserBackend[], parentUserId: string): ParentMoodChildProfile[] {
  const byId = new Map(users.map((u) => [u.id, u]));
  const parent = byId.get(parentUserId);
  if (!parent || parent.role !== 'parent' || !parent.children?.length) return [];

  const out: ParentMoodChildProfile[] = [];
  for (const studentId of parent.children) {
    const student = byId.get(studentId);
    if (student?.role === 'student') {
      out.push({ studentId, displayName: student.name });
    } else {
      out.push({ studentId, displayName: studentId });
    }
  }
  return out;
}
