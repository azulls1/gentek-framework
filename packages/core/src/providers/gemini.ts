import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, ChatMessage, CompletionOptions } from './types.js';

const DEFAULT_MODEL = 'gemini-2.0-flash';

export class GeminiProvider implements AIProvider {
  readonly id = 'gemini' as const;
  readonly displayName = 'Google Gemini';
  readonly defaultModel = DEFAULT_MODEL;

  private client: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY no encontrada. Configúrala en .env o pásala explícitamente.');
    }
    this.client = new GoogleGenerativeAI(key);
  }

  async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: options.model ?? DEFAULT_MODEL,
      systemInstruction: options.system,
    });

    // Gemini espera history en formato de roles user/model (no assistant)
    const history = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    if (history.length === 0) {
      return '';
    }

    const lastUserMessage = history[history.length - 1];
    const priorHistory = history.slice(0, -1);

    const chat = model.startChat({ history: priorHistory });
    const response = await chat.sendMessage(lastUserMessage.parts[0].text);

    return response.response.text();
  }
}
