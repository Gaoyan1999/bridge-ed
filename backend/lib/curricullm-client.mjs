import { buildDemoDraft } from './demo-generator.mjs';

function readRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set.`);
  }
  return value;
}

function extractJsonBlock(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text;
}

function normalizeGeneratedDraft(payload, fallbackInput) {
  const actions = Array.isArray(payload.actions)
    ? payload.actions.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
    : [];

  const fallback = buildDemoDraft(fallbackInput);

  return {
    summaryEn:
      typeof payload.summaryEn === 'string' && payload.summaryEn.trim() ? payload.summaryEn.trim() : fallback.summaryEn,
    summaryZh:
      typeof payload.summaryZh === 'string' && payload.summaryZh.trim() ? payload.summaryZh.trim() : fallback.summaryZh,
    actions: actions.length === 3 ? actions : fallback.actions,
  };
}

function buildPrompt(input) {
  return [
    'You are CurricuLLM working for BridgeEd, a school-home communication tool.',
    'Rewrite classroom information into parent-friendly, actionable support.',
    'Respond with valid JSON only using this schema:',
    '{"summaryEn":"string","summaryZh":"string","actions":["string","string","string"]}',
    'Requirements:',
    '- Use plain language for parents.',
    '- Keep the advice practical and realistic for busy families.',
    '- Make actions specific, short, and supportive.',
    '- Avoid jargon where possible.',
    `Class / lesson: ${input.classTitle || ''}`,
    `Grade: ${input.grade || input.gradeSubject || ''}`,
    `Subject: ${input.subject || ''}`,
    `Topic: ${input.topic || ''}`,
    `Teacher notes: ${input.notes || ''}`,
  ].join('\n');
}

export async function generateWithCurricuLLM(input) {
  const apiUrl = readRequiredEnv('CURRICULLM_API_URL');
  const apiKey = readRequiredEnv('CURRICULLM_API_KEY');
  const model = process.env.CURRICULLM_MODEL || 'curricullm-default';
  const authHeader = process.env.CURRICULLM_AUTH_HEADER || 'Authorization';
  const authScheme = process.env.CURRICULLM_AUTH_SCHEME || 'Bearer';

  const body = {
    model,
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content: 'You convert teacher input into parent-friendly communication aligned to school context.',
      },
      {
        role: 'user',
        content: buildPrompt(input),
      },
    ],
  };

  const headers = {
    'Content-Type': 'application/json',
    [authHeader]: authScheme ? `${authScheme} ${apiKey}` : apiKey,
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CurricuLLM API failed (${response.status}): ${text || response.statusText}`);
  }

  const data = await response.json();
  const content =
    data?.choices?.[0]?.message?.content ??
    data?.output_text ??
    data?.content ??
    data?.result;

  if (typeof content === 'object' && content !== null) {
    return normalizeGeneratedDraft(content, input);
  }

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('CurricuLLM response did not contain usable content.');
  }

  const parsed = JSON.parse(extractJsonBlock(content));
  return normalizeGeneratedDraft(parsed, input);
}
