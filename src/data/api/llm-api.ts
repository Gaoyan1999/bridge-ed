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
  /** Primary title line (wizard 鈥淭opic & focus鈥?, e.g. 鈥淰an Gogh's Style鈥? */
  topic: string;
  grade: string;
  subject: string;
  /** Class / lesson title (optional context for the model). */
  classTitle?: string;
  /** Teacher notes (optional). */
  notes?: string;
};

/** Demo hero images 鈥?mock rotates by topic/subject/grade until a real image model exists. */
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

/** Hero/cover for student Knowledge 鈥?mirrors backend shape; combine with {@link generateChildKnowledge} text. */
export type LearningCardChildKnowledgeHero = Pick<LearningCardChildKnowledge, 'heroImageUrl' | 'heroImageAlt'>;

/** Demo copy for student Knowledge discovery (plain text; URLs on their own lines become links in UI). */
function buildMockChildKnowledgeContent(topicRaw: string, subject: string, grade: string): string {
  const topic = topicRaw.trim() || 'this topic';
  const ctx = [subject, grade].filter(Boolean).join(' 路 ');
  return [
    `Below are a few short videos we picked for 鈥?{topic}鈥?(${ctx}) 鈥?kid-friendly pacing and clear visuals. Watch with a parent and ask yourself: how does this connect to what you鈥檙e learning in class?`,
    '',
    '### 1. Getting started: build a big-picture feel',
    `Video: Introduction for kids 鈥?${topic}`,
    'https://www.youtube.com/watch?v=87SftBC1vFo',
    '**Why we picked it:** a simple 鈥渕ap鈥?in plain language so you know what question we鈥檙e tackling today 鈥?great for a first look.',
    '',
    '### 2. Going deeper: make the key ideas click',
    `Video: Key ideas explained 鈥?${topic}`,
    'https://www.youtube.com/watch?v=5vZlQe7yM8Y',
    '**Why we picked it:** connect abstract words to concrete examples 鈥?good for understanding and a few keywords to remember.',
    '',
    '### 3. Hands-on or stretch: try it, talk it out',
    `Video: Try it / mini activity 鈥?${topic}`,
    'https://www.youtube.com/watch?v=QFJ5QdG1J1k',
    '**Why we picked it:** a short task or game-style demo 鈥?after watching, try a quick exercise or explain it to a parent.',
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
    heroImageAlt: `${pick.altBase} 鈥?${topic} (${input.subject} 路 ${input.grade})`,
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

/** Optional card context when running a Knowledge 鈥渢onight鈥?slash command. */
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
  uiLang?: 'en' | 'zh' | 'fr';
  threadId: string;
  threadTitle?: string;
  message: string;
  history?: ChatRespondHistoryMessage[];
  cardContext?: {
    topic?: string;
    grade?: string;
    subject?: string;
    classLessonTitle?: string;
    parentSummary?: string;
    tonightActions?: Array<{ preset: string; include: boolean; text?: string }>;
    isFirstExplanation?: boolean;
  };
};

export type ChatRespondStreamHandlers = {
  onDelta: (delta: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (error: string) => void;
};

/** Mock replies 鈥?used when `VITE_USE_LLM` is off or as fallback. */
const MOCK_KNOWLEDGE_QUIZ_REPLY =
  '**Quick check (Demo)**\n\n' +
  'Try these in order鈥攕ay your answers out loud or jot them in chat:\n\n' +
  '1. In one sentence, what is the **main idea** your teacher wants you to remember from this lesson?\n' +
  '2. Name **one example** from class (or the card) that shows that idea.\n' +
  '3. What is **one question** you still have鈥攐r one thing you鈥檇 explain differently next time?\n\n' +
  'Reply with 1鈥? short bullets when you鈥檙e ready.';

const MOCK_KNOWLEDGE_PRACTICE_REPLY =
  '**Mini practice (Demo)**\n\n' +
  'Let鈥檚 use **Van Gogh鈥檚 approach** for a quick exercise: **paint a sunflower**.\n\n' +
  '- **Brushwork:** Use thick paint and short strokes鈥攍eave visible marks like Van Gogh; it doesn鈥檛 need to be perfectly smooth.\n' +
  '- **Color:** Bright yellow as the main hue; add a little deep green and ochre for the center and shadows.\n' +
  '- **Head and petals:** Start with a flat oval for the flower head, then use radiating strokes for petal direction鈥攁dd a hint of swirl or movement if you like.\n\n' +
  'When you鈥檙e done, share the three colors you used, what you鈥檇 tweak next鈥攐r upload a photo.';

const MOCK_KNOWLEDGE_TEACH_BACK_REPLY =
  '**Teach-back (Demo)**\n\n' +
  'Pretend you鈥檙e the teacher for two minutes:\n\n' +
  '- Walk your parent through the topic **in your own words**, smallest steps first.\n' +
  '- Use **one drawing, gesture, or everyday example** so they can 鈥渟ee鈥?it.\n' +
  '- End with: 鈥淭he part I鈥檓 most sure about is ___; the part I want to check is ___.鈥漒n\n' +
  'When you鈥檙e done, your parent can react or ask one follow-up question here.';

async function mockExplainTerminologyToParents(
  input: LearningCardGenerateInput,
): Promise<LearningCardGenerateResult> {
  await new Promise((r) => setTimeout(r, 320));
  const topic = input.topic.trim() || 'this topic';
  const ctx = `${input.subject} 路 ${input.grade}`;
  return {
    translatedSummaries: {
      en: `[Demo] Parent summary for "${topic}" (${ctx}). Edit before sending.`,
      zh: `[Demo] Parent summary (ZH placeholder) for "${topic}" (${ctx}).`,
      fr: `[Demo] Resume parents for "${topic}" (${ctx}).`,
    },
    source: 'demo-fallback',
  };
}

/**
 * HTTP client for backend LLM routes (`/learning-cards/generate`).
 * Same idea as {@link getDataLayer} 鈥?one place for LLM-facing API calls.
 */
export class LlmApi {
  private async callChatRespond(input: ChatRespondInput): Promise<KnowledgeTonightCommandResult> {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/chat/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: input.role,
        uiLang: input.uiLang ?? 'en',
        threadId: input.threadId,
        threadTitle: input.threadTitle ?? '',
        message: input.message,
        history: input.history ?? [],
        cardContext: input.cardContext ?? null,
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

  async knowledgeChatRespondStream(
    input: ChatRespondInput,
    handlers: ChatRespondStreamHandlers,
  ): Promise<KnowledgeTonightCommandResult> {
    if (!getUseLlm()) {
      const mock = 'I got your message. Tell me a bit more so I can help step by step.';
      handlers.onDelta(mock);
      handlers.onDone?.(mock);
      return { reply: mock };
    }

    const base = getApiBaseUrl();
    const res = await fetch(`${base}/chat/respond/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: input.role,
        uiLang: input.uiLang ?? 'en',
        threadId: input.threadId,
        threadTitle: input.threadTitle ?? '',
        message: input.message,
        history: input.history ?? [],
        cardContext: input.cardContext ?? null,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to get stream chat response.');
    }

    if (!res.body) {
      return this.knowledgeChatRespond(input);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      for (const event of events) {
        const line = event
          .split('\n')
          .map((s) => s.trim())
          .find((s) => s.startsWith('data:'));
        if (!line) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') {
          handlers.onDone?.(full);
          return { reply: full };
        }
        try {
          const data = JSON.parse(payload) as { delta?: string; error?: string };
          if (data.error) {
            handlers.onError?.(data.error);
            throw new Error(data.error);
          }
          if (data.delta) {
            full += data.delta;
            handlers.onDelta(data.delta);
          }
        } catch {
          // ignore malformed stream chunks
        }
      }
    }

    handlers.onDone?.(full);
    return { reply: full };
  }

  /**
   * Student Knowledge cover image (hero).
   * Mock only 鈥?replace with `POST /learning-cards/child-knowledge/hero` (or similar) when the backend exists.
   */
  async generateChildKnowledgeHero(input: LearningCardChildKnowledgeGenerateInput): Promise<LearningCardChildKnowledgeHero> {
    if (!getUseLlm()) {
      await new Promise((r) => setTimeout(r, 220));
      return pickMockChildHero(input);
    }
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/learning-cards/child-knowledge/hero`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to generate child knowledge hero.');
    }
    const data = (await res.json()) as LearningCardChildKnowledgeHero;
    return data;
  }

  /**
   * Student Knowledge discovery body (markdown-friendly intro, video picks, links).
   * Mock only 鈥?replace with `POST /learning-cards/child-knowledge` (or similar) when the backend exists.
   */
  async generateChildKnowledge(
    input: LearningCardChildKnowledgeGenerateInput,
  ): Promise<Pick<LearningCardChildKnowledge, 'content'>> {
    if (!getUseLlm()) {
      await new Promise((r) => setTimeout(r, 280));
      const content = buildMockChildKnowledgeContent(input.topic, input.subject, input.grade);
      return { content };
    }
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/learning-cards/child-knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to generate child knowledge content.');
    }
    const data = (await res.json()) as Pick<LearningCardChildKnowledge, 'content'>;
    return data;
  }

  /** `POST /learning-cards/generate` 鈥?parent-facing summary from class context (or mock when `VITE_USE_LLM` is off). */
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
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/learning-cards/knowledge-tonight/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardTitle: input.cardTitle ?? '' }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to run Knowledge quiz.');
    }
    return res.json() as Promise<KnowledgeTonightCommandResult>;
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
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/learning-cards/knowledge-tonight/practice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardTitle: input.cardTitle ?? '' }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to run Knowledge practice.');
    }
    return res.json() as Promise<KnowledgeTonightCommandResult>;
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
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/learning-cards/knowledge-tonight/teach-back`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardTitle: input.cardTitle ?? '' }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to run Knowledge teach-back.');
    }
    return res.json() as Promise<KnowledgeTonightCommandResult>;
  }
}


