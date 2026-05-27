import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { ensureGitignoreEntries } from '../src/commands/init.js';
import { isDotEnvKeyAllowed } from '../src/commands/cycle.js';

describe('Security: .gitignore brownfield safety (#3)', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(resolve(tmpdir(), 'iagentek-sec-gi-'));
  });
  afterEach(() => rmSync(projectDir, { recursive: true, force: true }));

  it('creates a new .gitignore with all required entries when none exists', () => {
    ensureGitignoreEntries(projectDir);
    const content = readFileSync(resolve(projectDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.env');
    expect(content).toContain('.iagentek/state.json');
    expect(content).toContain('.iagentek/.transcripts/');
    expect(content).toContain('.iagentek/.cache/');
  });

  it('appends missing entries to a brownfield .gitignore', () => {
    writeFileSync(resolve(projectDir, '.gitignore'), 'node_modules/\ndist/\n', 'utf-8');
    ensureGitignoreEntries(projectDir);
    const content = readFileSync(resolve(projectDir, '.gitignore'), 'utf-8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('dist/');
    expect(content).toContain('.iagentek/state.json');
    expect(content).toContain('.iagentek/.transcripts/');
    expect(content).toContain('.env');
  });

  it('does not duplicate entries that are already present', () => {
    writeFileSync(
      resolve(projectDir, '.gitignore'),
      '.env\n.iagentek/state.json\nnode_modules/\n',
      'utf-8'
    );
    ensureGitignoreEntries(projectDir);
    const content = readFileSync(resolve(projectDir, '.gitignore'), 'utf-8');
    expect(content.match(/^\.env$/gm)?.length).toBe(1);
    expect(content.match(/^\.iagentek\/state\.json$/gm)?.length).toBe(1);
    // The two missing ones must have been added
    expect(content).toContain('.iagentek/.transcripts/');
    expect(content).toContain('.iagentek/.cache/');
  });

  it('handles a .gitignore that does not end with newline', () => {
    writeFileSync(resolve(projectDir, '.gitignore'), 'node_modules/', 'utf-8');
    ensureGitignoreEntries(projectDir);
    const content = readFileSync(resolve(projectDir, '.gitignore'), 'utf-8');
    expect(content.split('\n')).toContain('node_modules/');
    expect(content.split('\n')).toContain('.env');
  });

  it('is idempotent (second call does not modify file)', () => {
    ensureGitignoreEntries(projectDir);
    const first = readFileSync(resolve(projectDir, '.gitignore'), 'utf-8');
    ensureGitignoreEntries(projectDir);
    const second = readFileSync(resolve(projectDir, '.gitignore'), 'utf-8');
    expect(second).toBe(first);
  });
});

describe('Security: .env key allowlist (#4)', () => {
  it('accepts known provider keys', () => {
    expect(isDotEnvKeyAllowed('ANTHROPIC_API_KEY')).toBe(true);
    expect(isDotEnvKeyAllowed('OPENAI_API_KEY')).toBe(true);
    expect(isDotEnvKeyAllowed('GEMINI_API_KEY')).toBe(true);
    expect(isDotEnvKeyAllowed('DEEPSEEK_API_KEY')).toBe(true);
    expect(isDotEnvKeyAllowed('GOOGLE_API_KEY')).toBe(true);
    expect(isDotEnvKeyAllowed('OLLAMA_HOST')).toBe(true);
  });

  it('accepts generic *_API_KEY / *_TOKEN / *_SECRET patterns', () => {
    expect(isDotEnvKeyAllowed('CUSTOM_API_KEY')).toBe(true);
    expect(isDotEnvKeyAllowed('GH_TOKEN')).toBe(true);
    expect(isDotEnvKeyAllowed('STRIPE_SECRET')).toBe(true);
  });

  it('rejects environment hijack attempts', () => {
    expect(isDotEnvKeyAllowed('PATH')).toBe(false);
    expect(isDotEnvKeyAllowed('LD_PRELOAD')).toBe(false);
    expect(isDotEnvKeyAllowed('NODE_OPTIONS')).toBe(false);
    expect(isDotEnvKeyAllowed('PYTHONPATH')).toBe(false);
    expect(isDotEnvKeyAllowed('HOME')).toBe(false);
    expect(isDotEnvKeyAllowed('USERPROFILE')).toBe(false);
  });

  it('rejects lowercase or malformed names', () => {
    expect(isDotEnvKeyAllowed('anthropic_api_key')).toBe(false);
    expect(isDotEnvKeyAllowed('')).toBe(false);
    expect(isDotEnvKeyAllowed('123_API_KEY')).toBe(false);
  });
});
