import OpenAI from 'openai';
import type { AIProvider, ChatMessage, CompletionOptions } from './types.js';

const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_MAX_TOKENS = 8192;

export class OpenAIProvider implements AIProvider {
  readonly id = 'openai' as const;
  readonly displayName = 'OpenAI';
  readonly defaultModel = DEFAULT_MODEL;

  private client: OpenAI;

  constructor(apiKey?: string, baseURL?: string) {
    const key = apiKey ?? process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OPENAI_API_KEY no encontrada. Configúrala en .env o pásala explícitamente.');
    }
    this.client = new OpenAI({ apiKey: key, baseURL });
  }

  async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<string> {
    const merged: ChatMessage[] = options.system
      ? [{ role: 'system', content: options.system }, ...messages]
      : messages;

    const response = await this.client.chat.completions.create({
      model: options.model ?? DEFAULT_MODEL,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options.temperature,
      messages: merged.map((m) => ({ role: m.role, content: m.content })),
    });

    return response.choices[0]?.message?.content ?? '';
  }
}
