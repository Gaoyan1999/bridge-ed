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

/** Demo copy for student Knowledge discovery (plain text; URLs on their own lines become links in UI). */
function buildMockChildKnowledgeContent(topicRaw: string, subject: string, grade: string): string {
  const topic = topicRaw.trim() || 'this topic';
  const ctx = [subject, grade].filter(Boolean).join(' · ');
  return [
    `Below are a few short videos we picked for “${topic}” (${ctx}) — kid-friendly pacing and clear visuals. Watch with a parent and ask yourself: how does this connect to what you’re learning in class?`,
    '',
    '### 1. Getting started: build a big-picture feel',
    `Video: Introduction for kids — ${topic}`,
    'https://www.youtube.com/watch?v=87SftBC1vFo',
    '**Why we picked it:** a simple “map” in plain language so you know what question we’re tackling today — great for a first look.',
    '',
    '### 2. Going deeper: make the key ideas click',
    `Video: Key ideas explained — ${topic}`,
    'https://www.youtube.com/watch?v=5vZlQe7yM8Y',
    '**Why we picked it:** connect abstract words to concrete examples — good for understanding and a few keywords to remember.',
    '',
    '### 3. Hands-on or stretch: try it, talk it out',
    `Video: Try it / mini activity — ${topic}`,
    'https://www.youtube.com/watch?v=QFJ5QdG1J1k',
    '**Why we picked it:** a short task or game-style demo — after watching, try a quick exercise or explain it to a parent.',
  ].join('\n');
}

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

/** Optional card context when running a Knowledge “tonight” slash command. */
export type KnowledgeTonightCommandInput = {
  cardTitle?: string;
};

/** AI reply body for quiz / practice / teach-back in Knowledge. */
export type KnowledgeTonightCommandResult = {
  reply: string;
};

export type ChatRespondHistoryMessage = {
  who: string;
  type: 'in' | 'out';
  text: string;
};

export type ChatRespondInput = {
  role: 'parent' | 'student' | 'teacher';
  threadId: string;
  threadTitle?: string;
  message: string;
  history?: ChatRespondHistoryMessage[];
};

/** Mock replies — used when `VITE_USE_LLM` is off or as fallback. */
const MOCK_KNOWLEDGE_QUIZ_REPLY =
  '**Quick check (Demo)**\n\n' +
  'Try these in order—say your answers out loud or jot them in chat:\n\n' +
  '1. In one sentence, what is the **main idea** your teacher wants you to remember from this lesson?\n' +
  '2. Name **one example** from class (or the card) that shows that idea.\n' +
  '3. What is **one question** you still have—or one thing you’d explain differently next time?\n\n' +
  'Reply with 1–3 short bullets when you’re ready.';

const MOCK_KNOWLEDGE_PRACTICE_REPLY =
  '**Mini practice (Demo)**\n\n' +
  'Let’s use **Van Gogh’s approach** for a quick exercise: **paint a sunflower**.\n\n' +
  '- **Brushwork:** Use thick paint and short strokes—leave visible marks like Van Gogh; it doesn’t need to be perfectly smooth.\n' +
  '- **Color:** Bright yellow as the main hue; add a little deep green and ochre for the center and shadows.\n' +
  '- **Head and petals:** Start with a flat oval for the flower head, then use radiating strokes for petal direction—add a hint of swirl or movement if you like.\n\n' +
  'When you’re done, share the three colors you used, what you’d tweak next—or upload a photo.';

const MOCK_KNOWLEDGE_TEACH_BACK_REPLY =
  '**Teach-back (Demo)**\n\n' +
  'Pretend you’re the teacher for two minutes:\n\n' +
  '- Walk your parent through the topic **in your own words**, smallest steps first.\n' +
  '- Use **one drawing, gesture, or everyday example** so they can “see” it.\n' +
  '- End with: “The part I’m most sure about is ___; the part I want to check is ___.”\n\n' +
  'When you’re done, your parent can react or ask one follow-up question here.';

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
  private async callChatRespond(input: ChatRespondInput): Promise<KnowledgeTonightCommandResult> {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/chat/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: input.role,
        threadId: input.threadId,
        threadTitle: input.threadTitle ?? '',
        message: input.message,
        history: input.history ?? [],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to get chat response.');
    }
    const data = (await res.json()) as { reply?: string };
    return { reply: data.reply ?? '' };
  }

  async knowledgeChatRespond(input: ChatRespondInput): Promise<KnowledgeTonightCommandResult> {
    if (!getUseLlm()) {
      await new Promise((r) => setTimeout(r, 320));
      return { reply: 'I got your message. Tell me a bit more so I can help step by step.' };
    }
    return this.callChatRespond(input);
  }

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
    const content = buildMockChildKnowledgeContent(input.topic, input.subject, input.grade);
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

  /**
   * Knowledge thread: response after user sends `/quiz`.
   * Mock when `VITE_USE_LLM` is false; otherwise `POST /learning-cards/knowledge-tonight/quiz`.
   */
  async knowledgeQuiz(input: KnowledgeTonightCommandInput = {}): Promise<KnowledgeTonightCommandResult> {
    if (!getUseLlm()) {
      await new Promise((r) => setTimeout(r, 320));
      return { reply: MOCK_KNOWLEDGE_QUIZ_REPLY };
    }
    return this.callChatRespond({
      role: 'student',
      threadId: 'knowledge-tonight-quiz',
      threadTitle: input.cardTitle ?? '',
      message: '/quiz',
      history: [],
    });
  }

  /**
   * Knowledge thread: response after user sends `/practice`.
   * Mock when `VITE_USE_LLM` is false; otherwise `POST /learning-cards/knowledge-tonight/practice`.
   */
  async knowledgePractice(input: KnowledgeTonightCommandInput = {}): Promise<KnowledgeTonightCommandResult> {
    if (!getUseLlm()) {
      await new Promise((r) => setTimeout(r, 320));
      return { reply: MOCK_KNOWLEDGE_PRACTICE_REPLY };
    }
    return this.callChatRespond({
      role: 'student',
      threadId: 'knowledge-tonight-practice',
      threadTitle: input.cardTitle ?? '',
      message: '/practice',
      history: [],
    });
  }

  /**
   * Knowledge thread: response after user sends `/teach-back`.
   * Mock when `VITE_USE_LLM` is false; otherwise `POST /learning-cards/knowledge-tonight/teach-back`.
   */
  async knowledgeTeachBack(input: KnowledgeTonightCommandInput = {}): Promise<KnowledgeTonightCommandResult> {
    if (!getUseLlm()) {
      await new Promise((r) => setTimeout(r, 320));
      return { reply: MOCK_KNOWLEDGE_TEACH_BACK_REPLY };
    }
    return this.callChatRespond({
      role: 'student',
      threadId: 'knowledge-tonight-teach-back',
      threadTitle: input.cardTitle ?? '',
      message: '/teach-back',
      history: [],
    });
  }
}
