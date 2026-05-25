import { spawn } from 'node:child_process';
import type { AIProvider, ChatMessage, CompletionOptions } from './types.js';

/**
 * Provider que delega en el CLI de Claude Code (`claude`) si está instalado.
 * Útil cuando el usuario ya tiene Claude Code autenticado y no quiere gestionar
 * una API key adicional.
 *
 * Requiere `claude` en PATH. Llama a `claude -p "<prompt>"` para una respuesta no interactiva.
 */
export class ClaudeCliProvider implements AIProvider {
  readonly id = 'claude-cli' as const;
  readonly displayName = 'Claude Code CLI (auth reusada)';
  readonly defaultModel = 'claude-opus-4-7';

  async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<string> {
    const prompt = buildPrompt(messages, options.system);
    return runClaudeCli(prompt, options.model ?? this.defaultModel);
  }
}

function buildPrompt(messages: ChatMessage[], system?: string): string {
  const parts: string[] = [];
  if (system) parts.push(`# System\n${system}`);
  for (const m of messages) {
    parts.push(`# ${m.role}\n${m.content}`);
  }
  return parts.join('\n\n');
}

function runClaudeCli(prompt: string, model: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', prompt, '--model', model], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk.toString()));
    child.stderr.on('data', (chunk) => (stderr += chunk.toString()));
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`claude CLI exited with code ${code}: ${stderr}`));
    });
  });
}
