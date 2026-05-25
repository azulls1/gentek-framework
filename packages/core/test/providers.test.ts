import { describe, it, expect, afterEach } from 'vitest';
import { detectProviders, preferredProvider, createProvider } from '../src/providers/index.js';

describe('detectProviders', () => {
  it('returns one entry per supported provider', () => {
    const results = detectProviders();
    const ids = results.map((r) => r.id);
    expect(ids).toEqual(
      expect.arrayContaining(['claude-cli', 'anthropic', 'openai', 'gemini', 'deepseek', 'ollama'])
    );
  });

  it('every result has id, available flag, and source', () => {
    for (const r of detectProviders()) {
      expect(r).toMatchObject({
        id: expect.any(String),
        available: expect.any(Boolean),
        source: expect.stringMatching(/^(env|cli|config|none)$/),
      });
    }
  });
});

describe('preferredProvider', () => {
  it('returns null when all are unavailable', () => {
    const result = preferredProvider([
      { id: 'anthropic', available: false, source: 'none' },
      { id: 'openai', available: false, source: 'none' },
    ]);
    expect(result).toBeNull();
  });

  it('returns the first available', () => {
    const result = preferredProvider([
      { id: 'anthropic', available: false, source: 'none' },
      { id: 'openai', available: true, source: 'env' },
      { id: 'gemini', available: true, source: 'env' },
    ]);
    expect(result?.id).toBe('openai');
  });
});

describe('createProvider', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('AnthropicProvider throws without API key', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => createProvider({ id: 'anthropic' })).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('OpenAIProvider throws without API key', () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => createProvider({ id: 'openai' })).toThrow(/OPENAI_API_KEY/);
  });

  it('GeminiProvider throws without API key', () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    expect(() => createProvider({ id: 'gemini' })).toThrow(/GEMINI_API_KEY/);
  });

  it('DeepSeekProvider throws without API key', () => {
    delete process.env.DEEPSEEK_API_KEY;
    expect(() => createProvider({ id: 'deepseek' })).toThrow(/DEEPSEEK_API_KEY/);
  });

  it('ClaudeCliProvider instantiates without API key', () => {
    expect(() => createProvider({ id: 'claude-cli' })).not.toThrow();
  });

  it('OllamaProvider instantiates without API key', () => {
    expect(() => createProvider({ id: 'ollama' })).not.toThrow();
  });

  it('AnthropicProvider instantiates with explicit API key', () => {
    const provider = createProvider({ id: 'anthropic', apiKey: 'sk-fake' });
    expect(provider.id).toBe('anthropic');
    expect(provider.defaultModel).toBe('claude-opus-4-7');
  });
});
