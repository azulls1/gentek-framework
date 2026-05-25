import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, ChatMessage, CompletionOptions } from './types.js';

const DEFAULT_MODEL = 'claude-opus-4-7';
const DEFAULT_MAX_TOKENS = 8192;

export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic' as const;
  readonly displayName = 'Anthropic (Claude API)';
  readonly defaultModel = DEFAULT_MODEL;

  private client: Anthropic;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error(
        'ANTHROPIC_API_KEY no encontrada. Configúrala en .env o pásala explícitamente.'
      );
    }
    this.client = new Anthropic({ apiKey: key });
  }

  async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<string> {
    const { system, others } = splitSystem(messages, options.system);

    const response = await this.client.messages.create({
      model: options.model ?? DEFAULT_MODEL,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options.temperature,
      system,
      messages: others.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    return text;
  }
}

function splitSystem(
  messages: ChatMessage[],
  explicitSystem?: string
): { system: string | undefined; others: ChatMessage[] } {
  const systemMessages = messages.filter((m) => m.role === 'system').map((m) => m.content);
  const others = messages.filter((m) => m.role !== 'system');
  const combined = [explicitSystem, ...systemMessages].filter(Boolean).join('\n\n');
  return { system: combined || undefined, others };
}
