/**
 * App user — teachers, parents, students (REST/JSON or IndexedDB).
 */

export type UserRole = 'teacher' | 'parent' | 'student';

export interface UserBackend {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Parent only: linked student user ids. */
  children?: string[];
}
