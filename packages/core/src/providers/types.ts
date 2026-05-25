export type ProviderId =
  | 'claude-cli'
  | 'anthropic'
  | 'openai'
  | 'gemini'
  | 'deepseek'
  | 'ollama';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  system?: string;
}

export interface AIProvider {
  id: ProviderId;
  displayName: string;
  defaultModel: string;
  complete(messages: ChatMessage[], options?: CompletionOptions): Promise<string>;
}

export interface ProviderDetectionResult {
  id: ProviderId;
  available: boolean;
  source: 'env' | 'cli' | 'config' | 'none';
  note?: string;
}
