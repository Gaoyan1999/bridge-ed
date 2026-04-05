import type { LearningCardChildKnowledge } from '@/bridge/types';
import { getApiBaseUrl, getUseLlm } from '@/data/config';

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

/**
 * Input for generating the student Knowledge discovery block (`LearningCardChildKnowledge`).
 * Call when creating/sending a card; mirrors the parent generator context (topic, grade, subject, notes).
 */
export type LearningCardChildKnowledgeGenerateInput = {
  /** Primary title line (wizard “Topic & focus”), e.g. “Van Gogh's Style”. */
  topic: string;
  grade: string;
  subject: string;
  /** Class / lesson title (optional context for the model). */
  classTitle?: string;
  /** Teacher notes (optional). */
  notes?: string;
};

/** Demo hero images — mock rotates by topic/subject/grade until a real image model exists. */
const MOCK_CHILD_HERO_IMAGES: readonly { url: string; altBase: string }[] = [
  {
    url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1200&q=80',
    altBase: 'Art and learning',
  },
  {
    url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
    altBase: 'Science and discovery',
  },
  {
    url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80',
    altBase: 'Learning in the classroom',
  },
];

/** Hero/cover for student Knowledge — mirrors backend shape; combine with {@link generateChildKnowledge} text. */
export type LearningCardChildKnowledgeHero = Pick<LearningCardChildKnowledge, 'heroImageUrl' | 'heroImageAlt'>;

function pickMockChildHero(input: LearningCardChildKnowledgeGenerateInput): LearningCardChildKnowledgeHero {
  const key = `${input.topic}\0${input.subject}\0${input.grade}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h + key.charCodeAt(i)) % 2147483647;
  const pick = MOCK_CHILD_HERO_IMAGES[Math.abs(h) % MOCK_CHILD_HERO_IMAGES.length]!;
  const topic = input.topic.trim() || 'Topic';
  return {
    heroImageUrl: pick.url,
    heroImageAlt: `${pick.altBase} — ${topic} (${input.subject} · ${input.grade})`,
  };
}

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

async function mockExplainTerminologyToParents(
  input: LearningCardGenerateInput,
): Promise<LearningCardGenerateResult> {
  await new Promise((r) => setTimeout(r, 320));
  const topic = input.topic.trim() || 'this topic';
  const ctx = `${input.subject} · ${input.grade}`;
  return {
    translatedSummaries: {
      en: `[Demo] Parent summary for “${topic}” (${ctx}). Edit before sending.`,
      zh: `[演示] 家长版摘要：「${topic}」（${ctx}）。发送前请修改。`,
      fr: `[Démo] Résumé parents : « ${topic} » (${ctx}). À relire avant envoi.`,
    },
    source: 'demo-fallback',
  };
}

/**
 * HTTP client for backend LLM routes (`/learning-cards/generate`).
 * Same idea as {@link getDataLayer} — one place for LLM-facing API calls.
 */
export class LlmApi {
  /**
   * Student Knowledge cover image (hero).
   * Mock only — replace with `POST /learning-cards/child-knowledge/hero` (or similar) when the backend exists.
   */
  async generateChildKnowledgeHero(input: LearningCardChildKnowledgeGenerateInput): Promise<LearningCardChildKnowledgeHero> {
    await new Promise((r) => setTimeout(r, 220));
    return pickMockChildHero(input);
  }

  /**
   * Student Knowledge discovery body (markdown-friendly intro, video picks, links).
   * Mock only — replace with `POST /learning-cards/child-knowledge` (or similar) when the backend exists.
   */
  async generateChildKnowledge(
    input: LearningCardChildKnowledgeGenerateInput,
  ): Promise<Pick<LearningCardChildKnowledge, 'content'>> {
    await new Promise((r) => setTimeout(r, 280));
    const ctx = [input.subject, input.grade].filter(Boolean).join(' · ');
    const topic = input.topic.trim() || '这个主题';
    const content = [
      `下面是根据「${topic}」（${ctx}）为你挑的几支适合孩子看的小短片，节奏友好、画面清晰。可以和家长一起看，边看边想：这个主题和你课上学的有什么联系？`,
      '',
      `1. 入门：先建立整体印象`,
      `视频：Introduction for kids — ${topic}`,
      'https://www.youtube.com/watch?v=87SftBC1vFo',
      '推荐：用简单语言搭一个“地图”，帮孩子知道今天要解决什么问题，适合第一次接触。',
      '',
      `2. 深入一点：把关键概念讲清楚`,
      `视频：Key ideas explained — ${topic}`,
      'https://www.youtube.com/watch?v=5vZlQe7yM8Y',
      '推荐：把抽象词和具体例子对上号，适合巩固理解、记几个关键词。',
      '',
      `3. 动手或延伸：试一试、说一说`,
      `视频：Try it / mini activity — ${topic}`,
      'https://www.youtube.com/watch?v=QFJ5QdG1J1k',
      '推荐：短任务或小游戏式演示，看完可以试一个小练习或讲给家长听。',
    ].join('\n');
    return { content };
  }

  /** `POST /learning-cards/generate` — parent-facing summary from class context (or mock when `VITE_USE_LLM` is off). */
  async explainTerminologyToParents(input: LearningCardGenerateInput): Promise<LearningCardGenerateResult> {
    if (!getUseLlm()) {
      return mockExplainTerminologyToParents(input);
    }
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
