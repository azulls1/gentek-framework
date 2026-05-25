import type { AIProvider, ChatMessage, CompletionOptions } from './types.js';

const DEFAULT_MODEL = 'llama3.1';
const DEFAULT_BASE_URL = 'http://localhost:11434';

interface OllamaChatResponse {
  message?: { content?: string };
  done?: boolean;
}

/**
 * Provider para Ollama local. Asume que `ollama serve` está corriendo en localhost:11434.
 */
export class OllamaProvider implements AIProvider {
  readonly id = 'ollama' as const;
  readonly displayName = 'Ollama (local)';
  readonly defaultModel = DEFAULT_MODEL;

  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.OLLAMA_HOST ?? DEFAULT_BASE_URL;
  }

  async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<string> {
    const merged: ChatMessage[] = options.system
      ? [{ role: 'system', content: options.system }, ...messages]
      : messages;

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model ?? DEFAULT_MODEL,
        messages: merged,
        stream: false,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama respondió ${response.status}: ${await response.text()}. ` +
          `Verifica que 'ollama serve' está corriendo en ${this.baseUrl}.`
      );
    }

    const data = (await response.json()) as OllamaChatResponse;
    return data.message?.content ?? '';
  }
}
