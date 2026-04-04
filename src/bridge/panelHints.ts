import type { TFunction } from 'i18next';
import type { Role } from '@/bridge/types';

export type PanelHints = {
  chat: string;
  mood: string;
  dashboard?: string;
  knowledge?: string;
};

/** Panel header hints from `hints.{role}.*` in locale JSON. */
export function panelHintsForRole(t: TFunction, role: Role): PanelHints {
  const base = `hints.${role}` as const;
  const out: PanelHints = {
    chat: t(`${base}.chat`),
    mood: t(`${base}.mood`),
  };
  if (role === 'parent' || role === 'teacher') {
    out.dashboard = t(`${base}.dashboard`);
  }
  if (role === 'parent' || role === 'student') {
    out.knowledge = t(`${base}.knowledge`);
  }
  return out;
}
