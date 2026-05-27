import { spawn } from 'node:child_process';
import type { AIProvider, ChatMessage, CompletionOptions } from './types.js';

/**
 * Provider que delega en el CLI de Claude Code (`claude`) si está instalado.
 * Útil cuando el usuario ya tiene Claude Code autenticado y no quiere gestionar
 * una API key adicional.
 *
 * El prompt se envía por stdin (no como argumento) para evitar que el shell
 * trunque prompts largos con saltos de línea y caracteres especiales,
 * especialmente en Windows.
 */
export class ClaudeCliProvider implements AIProvider {
  readonly id = 'claude-cli' as const;
  readonly displayName = 'Claude Code CLI (auth reusada)';
  readonly defaultModel = 'claude-opus-4-7';

  async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<string> {
    const prompt = buildPrompt(messages, options.system);
    const model = options.model ?? this.defaultModel;
    if (!isSafeModelId(model)) {
      throw new Error(
        `Refusing to spawn claude CLI: model id "${model}" contains unsafe characters. ` +
          `Only [A-Za-z0-9._:/-] are permitted (config.yaml provider.model).`
      );
    }
    return runClaudeCli(prompt, model);
  }
}

/**
 * On Windows, `claude` resolves to `claude.cmd` and we have to spawn with
 * shell:true. That means any subsequent argument is interpreted by cmd.exe,
 * so a hostile `model` value from config.yaml (e.g. `& calc.exe`) would be
 * a shell-injection vector. Restrict to a strict alphanumeric / dot / slash /
 * colon / dash / underscore character set — covers every real model id
 * (claude-opus-4-7, anthropic/claude-3.5-sonnet, gpt-4o, etc.) without
 * letting punctuation that the shell interprets through.
 */
export function isSafeModelId(model: string): boolean {
  return typeof model === 'string' && model.length > 0 && /^[A-Za-z0-9._:/-]+$/.test(model);
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
    // On Windows, `claude` resolves to claude.cmd which requires shell:true to
    // be spawnable. The prompt goes via stdin (not as an argument), so shell
    // quoting/truncation is no longer a concern.
    const isWindows = process.platform === 'win32';

    const child = spawn('claude', ['-p', '--model', model], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isWindows,
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

    // Send the prompt via stdin to avoid shell argument truncation.
    child.stdin.write(prompt);
    child.stdin.end();
  });
}
