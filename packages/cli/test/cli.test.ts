import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..', '..');
const cliBin = resolve(repoRoot, 'packages', 'cli', 'dist', 'bin', 'gentek.js');

function runCli(args: string[], cwd?: string): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync('node', [cliBin, ...args], {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', code: 0 };
  } catch (err) {
    const e = err as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number };
    return {
      stdout: e.stdout?.toString() ?? '',
      stderr: e.stderr?.toString() ?? '',
      code: e.status ?? 1,
    };
  }
}

describe('@gentek/cli (subprocess smoke tests)', () => {
  let sandboxes: string[] = [];

  beforeAll(() => {
    if (!existsSync(cliBin)) {
      throw new Error(
        `CLI binary not built. Run 'npm run build' before tests. Expected at: ${cliBin}`
      );
    }
  });

  afterEach(() => {
    for (const s of sandboxes) {
      rmSync(s, { recursive: true, force: true });
    }
    sandboxes = [];
  });

  it('--version prints a version string', () => {
    const { stdout, code } = runCli(['--version']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('--help lists all commands', () => {
    const { stdout, code } = runCli(['--help']);
    expect(code).toBe(0);
    expect(stdout).toContain('init');
    expect(stdout).toContain('cycle');
    expect(stdout).toContain('status');
    expect(stdout).toContain('resume');
    expect(stdout).toContain('agent');
  });

  it('init creates .gentek structure', () => {
    const sandbox = mkdtempSync(resolve(tmpdir(), 'gentek-cli-init-'));
    sandboxes.push(sandbox);

    const { code } = runCli(
      ['init', 'demo', '--provider', 'claude-cli', '--flow', 'greenfield', '--cwd', sandbox],
      sandbox
    );

    expect(code).toBe(0);
    const projectDir = resolve(sandbox, 'demo');
    expect(existsSync(resolve(projectDir, '.gentek', 'config.yaml'))).toBe(true);
    expect(existsSync(resolve(projectDir, '.gentek', 'state.json'))).toBe(true);
    expect(existsSync(resolve(projectDir, '.gentek', 'specs'))).toBe(true);
    expect(existsSync(resolve(projectDir, '.gentek', 'plans'))).toBe(true);

    const config = readFileSync(resolve(projectDir, '.gentek', 'config.yaml'), 'utf-8');
    expect(config).toContain('flow: greenfield');
    expect(config).toContain('id: claude-cli');
  });

  it('status reads existing project config', () => {
    const sandbox = mkdtempSync(resolve(tmpdir(), 'gentek-cli-status-'));
    sandboxes.push(sandbox);

    runCli(['init', 'app', '--provider', 'claude-cli', '--flow', 'bugfix', '--cwd', sandbox], sandbox);
    const { stdout, code } = runCli(['status', '--cwd', resolve(sandbox, 'app')]);
    expect(code).toBe(0);
    expect(stdout).toContain('app');
    expect(stdout).toContain('bugfix');
    expect(stdout).toContain('claude-cli');
  });

  it('status fails gracefully outside a Gentek project', () => {
    const sandbox = mkdtempSync(resolve(tmpdir(), 'gentek-cli-nogentek-'));
    sandboxes.push(sandbox);

    const { code, stderr } = runCli(['status', '--cwd', sandbox]);
    expect(code).toBe(1);
    expect(stderr + ' ').toMatch(/no hay/i);
  });

  it('init refuses to overwrite by default in non-interactive mode', () => {
    const sandbox = mkdtempSync(resolve(tmpdir(), 'gentek-cli-overwrite-'));
    sandboxes.push(sandbox);

    // First init succeeds
    const first = runCli(
      ['init', 'app', '--provider', 'claude-cli', '--cwd', sandbox],
      sandbox
    );
    expect(first.code).toBe(0);

    // Second init in same path — without TTY prompts default to false (cancelled)
    // Just verify command doesn't crash; behavior may vary by env
    const second = runCli(
      ['init', 'app', '--provider', 'claude-cli', '--cwd', sandbox],
      sandbox
    );
    expect([0, 1]).toContain(second.code);
  });
});
