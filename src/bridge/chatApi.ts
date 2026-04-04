import { getApiBaseUrl } from '@/data';
import type { Role, ThreadMessage } from '@/bridge/types';

export type ChatRespondRequest = {
  role: Role;
  threadTitle: string;
  threadId: string;
  message: string;
  history: ThreadMessage[];
};

export type ChatRespondResponse = {
  reply: string;
  source: 'curricullm' | 'demo-fallback';
  warning?: string;
};

export async function requestChatReply(input: ChatRespondRequest): Promise<ChatRespondResponse> {
  const base = getApiBaseUrl();
  if (!base) {
    return {
      reply:
        'BridgeEd AI is not connected to the backend yet. Set VITE_API_BASE_URL to enable live chat replies.',
      source: 'demo-fallback',
    };
  }

  const res = await fetch(`${base}/chat/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to get chat reply.');
  }

  return res.json() as Promise<ChatRespondResponse>;
}
