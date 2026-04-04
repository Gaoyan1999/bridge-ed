import { getApiBaseUrl } from '@/data/config';

/** Request body for `POST /learning-cards/generate` (CurricuLLM). */
export type LearningCardGenerateInput = {
  classTitle: string;
  topic: string;
  /** Non-empty (validated on backend). */
  grade: string;
  /** Non-empty (validated on backend). */
  subject: string;
  notes: string;
};

export type LearningCardGenerateResult = {
  translatedSummaries: {
    zh: string;
    en: string;
    fr: string;
  };
  actions?: string[];
  source?: 'curricullm' | 'demo-fallback';
  warning?: string;
};

let singleton: LlmApi | null = null;

export function getLlmApi(): LlmApi {
  if (!singleton) {
    singleton = new LlmApi();
  }
  return singleton;
}

/** For tests or when you need a fresh instance. */
export function createLlmApi(): LlmApi {
  return new LlmApi();
}

/**
 * HTTP client for backend LLM routes (`/learning-cards/generate`).
 * Same idea as {@link getDataLayer} — one place for LLM-facing API calls.
 */
export class LlmApi {
  /** `POST /learning-cards/generate` — parent-facing summary from class context. */
  async explainTerminologyToParents(input: LearningCardGenerateInput): Promise<LearningCardGenerateResult> {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/learning-cards/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to generate learning card.');
    }

    return res.json() as Promise<LearningCardGenerateResult>;
  }
}
