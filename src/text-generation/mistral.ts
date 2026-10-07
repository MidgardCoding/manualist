// Mistral AI provider helpers. Plain fetch is used instead of the
// @mistralai/mistralai SDK because the SDK bundle breaks the Vite/Rollup
// production build (unresolvable @opentelemetry/api peer import). The Mistral
// chat API is OpenAI-compatible, so the response shapes below mirror the
// OpenRouter ones and downstream code works unchanged.

export const MISTRAL_MODEL = 'ministral-8b-2512';
export const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

export type MistralChatRole = 'system' | 'user' | 'assistant';

export interface MistralChatMessage {
  role: MistralChatRole;
  content: string;
}

export function getMistralApiKey(): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  return env.MISTRAL_API_KEY ?? env.VITE_MISTRAL_API_KEY;
}

export function hasMistralApiKey(): boolean {
  return !!getMistralApiKey();
}

export function mistralHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getMistralApiKey()}`,
    'Content-Type': 'application/json',
  };
}

// Mistral message content can be a plain string or an array of content chunks - normalize to a string so downstream code always gets text.
export function normalizeMistralContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((chunk) => {
        if (typeof chunk === 'string') return chunk;
        if (chunk && typeof chunk === 'object') {
          const text = (chunk as any).text ?? (chunk as any).content ?? '';
          return typeof text === 'string' ? text : '';
        }
        return '';
      })
      .join('');
  }
  return '';
}

export function toMistralMessages(
  messages: { role: string; content: string }[]
): MistralChatMessage[] {
  return messages.map((m) => ({
    role: (m.role === 'system' || m.role === 'assistant' ? m.role : 'user') as MistralChatRole,
    content: m.content,
  }));
}
