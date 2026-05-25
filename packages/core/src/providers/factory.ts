import type { AIProvider, ProviderId } from './types.js';
import { AnthropicProvider } from './anthropic.js';
import { ClaudeCliProvider } from './claude-cli.js';

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
    case 'gemini':
    case 'deepseek':
    case 'ollama':
      throw new Error(
        `Provider "${config.id}" todavía no implementado. ` +
          `MVP soporta: claude-cli, anthropic. Otros llegan en iteración 2.`
      );
    default:
      throw new Error(`Provider desconocido: ${config.id satisfies never}`);
  }
}
