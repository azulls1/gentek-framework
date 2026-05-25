import type { AIProvider, ProviderId } from './types.js';
import { AnthropicProvider } from './anthropic.js';
import { ClaudeCliProvider } from './claude-cli.js';
import { OpenAIProvider } from './openai.js';
import { GeminiProvider } from './gemini.js';
import { DeepSeekProvider } from './deepseek.js';
import { OllamaProvider } from './ollama.js';

export interface ProviderConfig {
  id: ProviderId;
  apiKey?: string;
  model?: string;
}

export function createProvider(config: ProviderConfig): AIProvider {
  switch (config.id) {
    case 'claude-cli':
      return new ClaudeCliProvider();
    case 'anthropic':
      return new AnthropicProvider(config.apiKey);
    case 'openai':
      return new OpenAIProvider(config.apiKey);
    case 'gemini':
      return new GeminiProvider(config.apiKey);
    case 'deepseek':
      return new DeepSeekProvider(config.apiKey);
    case 'ollama':
      return new OllamaProvider();
    default:
      throw new Error(`Provider desconocido: ${config.id satisfies never}`);
  }
}
