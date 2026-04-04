import { getApiBaseUrl } from '@/data';
import {
  mockGenerateLearningCard,
  type MockLearningCardDraft,
  type MockLearningCardInput,
} from './mockLearningCardGenerate';

export type LearningCardGenerateInput = MockLearningCardInput & {
  grade?: string;
  subject?: string;
};

export type LearningCardGenerateResult = MockLearningCardDraft & {
  source?: 'curricullm' | 'demo-fallback';
  warning?: string;
};

export async function generateLearningCardDraft(
  input: LearningCardGenerateInput,
): Promise<LearningCardGenerateResult> {
  const base = getApiBaseUrl();
  if (!base) {
    return mockGenerateLearningCard(input);
  }

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
