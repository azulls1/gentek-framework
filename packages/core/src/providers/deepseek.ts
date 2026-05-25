import OpenAI from 'openai';
import type { AIProvider, ChatMessage, CompletionOptions } from './types.js';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_MAX_TOKENS = 8192;

/**
 * DeepSeek expone una API OpenAI-compatible. Usamos el cliente OpenAI con baseURL custom.
 */
export class DeepSeekProvider implements AIProvider {
  readonly id = 'deepseek' as const;
  readonly displayName = 'DeepSeek';
  readonly defaultModel = DEFAULT_MODEL;

  private client: OpenAI;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.DEEPSEEK_API_KEY;
    if (!key) {
      throw new Error('DEEPSEEK_API_KEY no encontrada.');
    }
    this.client = new OpenAI({ apiKey: key, baseURL: DEEPSEEK_BASE_URL });
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
