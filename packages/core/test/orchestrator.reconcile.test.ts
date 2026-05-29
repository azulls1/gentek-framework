import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Orchestrator } from '../src/orchestrator/index.js';
import { ConfigManager } from '../src/config/loader.js';
import { loadFlowDefinition, validateUniqueCheckpointIds } from '../src/flow/loader.js';
import { StateManager } from '../src/state/manager.js';
import type { AIProvider, ChatMessage } from '../src/providers/types.js';
import type { CheckpointHandler } from '../src/checkpoints/manager.js';

class MockProvider implements AIProvider {
  readonly id = 'anthropic' as const;
  readonly displayName = 'Mock';
  readonly defaultModel = 'mock-model';
  public calls: Array<{ messages: ChatMessage[]; system?: string }> = [];

  async complete(messages: ChatMessage[], options?: { system?: string }): Promise<string> {
    this.calls.push({ messages, system: options?.system });
    return '```file:.iagentek/dummy.md\n# dummy\n```';
  }
}

describe('Orchestrator — crash-recovery reconcile (v0.4.5)', () => {
  let dir: string;
  let provider: MockProvider;

  beforeEach(() => {
    dir = mkdtempSync(resolve(tmpdir(), 'iagentek-reconcile-'));
    provider = new MockProvider();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reconciles an approved checkpoint whose phase was not marked complete (crash post-approve)', async () => {
    const cfgMgr = new ConfigManager(dir);
    const config = cfgMgr.defaultConfig('crash-1', 'anthropic', 'greenfield');
    cfgMgr.save(config);
    const flow = loadFlowDefinition('greenfield');

    // Simulate crash: checkpoint of phase 0 (discovery) approved but phase
    // not yet in completedPhases.
    const stateMgr = new StateManager(dir);
    stateMgr.init('crash-1', 'greenfield');
    stateMgr.recordCheckpoint('discovery-approved', 'approved before the crash');

    const singlePhase = { ...flow, phases: flow.phases.slice(0, 1) };
    const handler: CheckpointHandler = async () => ({ decision: 'approve' });

    const orchestrator = new Orchestrator({
      projectDir: dir,
      config,
      flow: singlePhase,
      provider,
      checkpointHandler: handler,
    });

    await orchestrator.run();

    // Reconcile should have marked discovery complete → no LLM call needed.
    expect(provider.calls).toHaveLength(0);
    const finalState = new StateManager(dir).load();
    expect(finalState.completedPhases).toContain('discovery');
  });

  it('does NOT reconcile when state is already consistent', async () => {
    const cfgMgr = new ConfigManager(dir);
    const config = cfgMgr.defaultConfig('consistent', 'anthropic', 'greenfield');
    cfgMgr.save(config);
    const flow = loadFlowDefinition('greenfield');
    const singlePhase = { ...flow, phases: flow.phases.slice(0, 1) };

    // No prior state — clean run.
    const handler: CheckpointHandler = async () => ({ decision: 'approve' });
    const orchestrator = new Orchestrator({
      projectDir: dir,
      config,
      flow: singlePhase,
      provider,
      checkpointHandler: handler,
    });
    await orchestrator.run();

    expect(provider.calls).toHaveLength(1); // ran normally
    const finalState = new StateManager(dir).load();
    expect(finalState.completedPhases).toContain('discovery');
  });

  it('reconciles multiple approved-but-incomplete phases in one pass', async () => {
    const cfgMgr = new ConfigManager(dir);
    const config = cfgMgr.defaultConfig('multi-reco', 'anthropic', 'greenfield');
    cfgMgr.save(config);
    const flow = loadFlowDefinition('greenfield');

    const stateMgr = new StateManager(dir);
    stateMgr.init('multi-reco', 'greenfield');
    // Two checkpoints approved, neither phase marked completed.
    stateMgr.recordCheckpoint('discovery-approved', undefined);
    stateMgr.recordCheckpoint('specs-approved', undefined);

    const twoPhases = { ...flow, phases: flow.phases.slice(0, 2) };
    const handler: CheckpointHandler = async () => ({ decision: 'approve' });

    const orchestrator = new Orchestrator({
      projectDir: dir,
      config,
      flow: twoPhases,
      provider,
      checkpointHandler: handler,
    });

    await orchestrator.run();
    expect(provider.calls).toHaveLength(0); // both phases reconciled, no LLM
    const finalState = new StateManager(dir).load();
    expect(finalState.completedPhases).toContain('discovery');
    expect(finalState.completedPhases).toContain('definition');
  });

  it('validateUniqueCheckpointIds rejects flows with duplicate checkpoint.id', () => {
    const dupe = {
      name: 'broken',
      description: 'test',
      version: '0.0.1',
      phases: [
        {
          id: 'a',
          name: 'A',
          agent: 'analyst',
          checkpoint: { id: 'same-cp', mode: 'required' as const, prompt: 'x' },
        },
        {
          id: 'b',
          name: 'B',
          agent: 'pm',
          checkpoint: { id: 'same-cp', mode: 'required' as const, prompt: 'y' },
        },
      ],
    };
    expect(() => validateUniqueCheckpointIds(dupe)).toThrow(/duplicate checkpoint\.id/);
  });

  it('all 4 real flows pass validateUniqueCheckpointIds', () => {
    for (const flowName of ['greenfield', 'brownfield', 'bugfix', 'refactor']) {
      // loadFlowDefinition calls validateUniqueCheckpointIds internally.
      expect(() => loadFlowDefinition(flowName)).not.toThrow();
    }
  });
});
