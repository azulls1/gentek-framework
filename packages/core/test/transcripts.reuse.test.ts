import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Orchestrator } from '../src/orchestrator/index.js';
import { ConfigManager } from '../src/config/loader.js';
import { loadFlowDefinition } from '../src/flow/loader.js';
import { StateManager } from '../src/state/manager.js';
import type { AIProvider, ChatMessage } from '../src/providers/types.js';
import type { CheckpointHandler } from '../src/checkpoints/manager.js';

class MockProvider implements AIProvider {
  readonly id = 'anthropic' as const;
  readonly displayName = 'Mock';
  readonly defaultModel = 'mock-model';
  public callCount = 0;
  public response = '```file:.iagentek/dummy.md\n# fresh from LLM\n```';

  async complete(_messages: ChatMessage[]): Promise<string> {
    this.callCount++;
    return this.response;
  }
}

function writeTranscript(dir: string, phaseId: string, content: string, mtimeMs: number) {
  const transcriptsDir = join(dir, '.iagentek', '.transcripts');
  mkdirSync(transcriptsDir, { recursive: true });
  const path = join(transcriptsDir, `${phaseId}.md`);
  writeFileSync(path, content, 'utf-8');
  const t = new Date(mtimeMs);
  utimesSync(path, t, t);
  return path;
}

describe('Orchestrator — transcript reuse <24h (v0.4.5)', () => {
  let dir: string;
  let provider: MockProvider;
  const approveAll: CheckpointHandler = async () => ({ decision: 'approve' });

  beforeEach(() => {
    dir = mkdtempSync(resolve(tmpdir(), 'iagentek-reuse-'));
    provider = new MockProvider();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function setup() {
    const cfgMgr = new ConfigManager(dir);
    const config = cfgMgr.defaultConfig('reuse-test', 'anthropic', 'greenfield');
    cfgMgr.save(config);
    const flow = loadFlowDefinition('greenfield');
    return { config, flow };
  }

  it('reuses a recent transcript (<24h, >200 bytes) instead of calling the LLM', async () => {
    const { config, flow } = setup();
    const recentTranscript =
      '```file:.iagentek/project-brief.md\n# Recovered Brief\n\n' +
      'A reasonably long body so the size guard (>200 bytes) is satisfied. '.repeat(5) +
      '\n```';
    // 1 hour old
    writeTranscript(dir, 'discovery', recentTranscript, Date.now() - 1 * 3600_000);

    const singlePhase = { ...flow, phases: flow.phases.slice(0, 1) };
    const orchestrator = new Orchestrator({
      projectDir: dir,
      config,
      flow: singlePhase,
      provider,
      checkpointHandler: approveAll,
    });

    await orchestrator.run();
    expect(provider.callCount).toBe(0);
    // The reused transcript should have produced the artifact mentioned inside it.
    expect(existsSync(resolve(dir, '.iagentek/project-brief.md'))).toBe(true);
  });

  it('does NOT reuse a transcript older than the reuse window (>24h)', async () => {
    const { config, flow } = setup();
    const oldTranscript =
      '```file:.iagentek/project-brief.md\n# Old\n' + 'x'.repeat(300) + '\n```';
    writeTranscript(dir, 'discovery', oldTranscript, Date.now() - 25 * 3600_000);

    const singlePhase = { ...flow, phases: flow.phases.slice(0, 1) };
    const orchestrator = new Orchestrator({
      projectDir: dir,
      config,
      flow: singlePhase,
      provider,
      checkpointHandler: approveAll,
    });

    await orchestrator.run();
    expect(provider.callCount).toBe(1);
  });

  it('does NOT reuse a tiny / placeholder transcript (≤200 bytes)', async () => {
    const { config, flow } = setup();
    // Recent but tiny — placeholder vibe.
    writeTranscript(dir, 'discovery', '# tiny', Date.now() - 1 * 3600_000);

    const singlePhase = { ...flow, phases: flow.phases.slice(0, 1) };
    const orchestrator = new Orchestrator({
      projectDir: dir,
      config,
      flow: singlePhase,
      provider,
      checkpointHandler: approveAll,
    });

    await orchestrator.run();
    expect(provider.callCount).toBe(1);
  });

  it('builtin agents (__codebase__) never reuse a transcript — they always run fresh', async () => {
    const cfgMgr = new ConfigManager(dir);
    const config = cfgMgr.defaultConfig('brown', 'anthropic', 'brownfield');
    cfgMgr.save(config);
    const flow = loadFlowDefinition('brownfield');

    // Pre-write a "fake" codebase transcript that we should ignore.
    writeTranscript(
      dir,
      'codebase-analysis',
      '# fake transcript\n' + 'pad '.repeat(100),
      Date.now() - 1 * 3600_000
    );

    const onlyCodebase = { ...flow, phases: flow.phases.slice(0, 1) };
    const orchestrator = new Orchestrator({
      projectDir: dir,
      config,
      flow: onlyCodebase,
      provider,
      checkpointHandler: approveAll,
    });

    await orchestrator.run();
    // Builtin doesn't call the LLM, but it also doesn't reuse the fake.
    expect(provider.callCount).toBe(0);
    expect(existsSync(resolve(dir, '.iagentek/current-state.md'))).toBe(true);
  });
});
