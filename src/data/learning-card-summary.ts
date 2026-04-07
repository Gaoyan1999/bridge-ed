import type { LearningCardItem, LearningCardTranslatedSummaries } from '@/bridge/types';
import i18n, { resolveI18nLng } from '@/i18n';

/** Matches `LearningCardBackend.translatedSummaries` keys. */
export type ParentSummaryUiLang = 'en' | 'zh' | 'fr';

export type ParentSummaryTranslated = LearningCardTranslatedSummaries;

/** Map i18next language tag to a supported UI lang for learning-card summaries. */
export function uiLangFromI18n(language: string | undefined): ParentSummaryUiLang {
  return resolveI18nLng(language);
}

/**
 * Pick the parent-facing summary for the current locale: prefer `translatedSummaries[locale]`,
 * then fall back to `parentSummary`, then any available translation.
 */
export function resolveParentSummaryForDisplay(
  parentSummary: string,
  translated: ParentSummaryTranslated | undefined,
  locale: ParentSummaryUiLang,
): string {
  const fromMap = translated?.[locale]?.trim();
  if (fromMap) return fromMap;
  const primary = parentSummary.trim();
  if (primary) return primary;
  for (const k of ['en', 'zh', 'fr'] as const) {
    const s = translated?.[k]?.trim();
    if (s) return s;
  }
  return '-';
}

/** `LearningCardItem.summary` is the canonical fallback (maps from `parentSummary`). */
export function resolveParentSummaryFromLearningCardItem(
  item: Pick<LearningCardItem, 'summary' | 'translatedSummaries'>,
  locale?: ParentSummaryUiLang,
): string {
  const lang = locale ?? uiLangFromI18n(i18n.language);
  return resolveParentSummaryForDisplay(item.summary, item.translatedSummaries, lang);
}

/** Raw backend row: `parentSummary` + optional `translatedSummaries`. */
export function resolveParentSummaryFromParts(
  parts: { parentSummary: string; translatedSummaries?: ParentSummaryTranslated },
  locale?: ParentSummaryUiLang,
): string {
  const lang = locale ?? uiLangFromI18n(i18n.language);
  return resolveParentSummaryForDisplay(parts.parentSummary, parts.translatedSummaries, lang);
}
