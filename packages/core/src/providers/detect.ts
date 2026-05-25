import { execSync } from 'node:child_process';
import type { ProviderDetectionResult, ProviderId } from './types.js';

/**
 * Detecta qué providers de IA están disponibles en el entorno actual.
 * Orden de preferencia: claude-cli > anthropic env > otros.
 * No falla si nada está disponible — devuelve lista marcando availability.
 */
export function detectProviders(): ProviderDetectionResult[] {
  return [
    detectClaudeCli(),
    detectEnvProvider('anthropic', 'ANTHROPIC_API_KEY'),
    detectEnvProvider('openai', 'OPENAI_API_KEY'),
    detectEnvProvider('gemini', 'GEMINI_API_KEY'),
    detectEnvProvider('deepseek', 'DEEPSEEK_API_KEY'),
    detectOllama(),
  ];
}

export function preferredProvider(
  results: ProviderDetectionResult[] = detectProviders()
): ProviderDetectionResult | null {
  return results.find((r) => r.available) ?? null;
}

function detectClaudeCli(): ProviderDetectionResult {
  try {
    const cmd = process.platform === 'win32' ? 'where claude' : 'which claude';
    execSync(cmd, { stdio: 'ignore' });
    return { id: 'claude-cli', available: true, source: 'cli', note: 'claude CLI en PATH' };
  } catch {
    return { id: 'claude-cli', available: false, source: 'none' };
  }
}

function detectEnvProvider(id: ProviderId, envVar: string): ProviderDetectionResult {
  const value = process.env[envVar];
  return {
    id,
    available: Boolean(value && value.length > 0),
    source: value ? 'env' : 'none',
    note: value ? `${envVar} encontrada` : `${envVar} no configurada`,
  };
}

function detectOllama(): ProviderDetectionResult {
  try {
    const cmd = process.platform === 'win32' ? 'where ollama' : 'which ollama';
    execSync(cmd, { stdio: 'ignore' });
    return { id: 'ollama', available: true, source: 'cli', note: 'ollama CLI en PATH' };
  } catch {
    return { id: 'ollama', available: false, source: 'none' };
  }
}
