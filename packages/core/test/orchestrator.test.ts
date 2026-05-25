import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Orchestrator } from '../src/orchestrator/index.js';
import { ConfigManager } from '../src/config/loader.js';
import { loadFlowDefinition } from '../src/flow/loader.js';
import type { AIProvider, ChatMessage } from '../src/providers/types.js';
import type { CheckpointHandler } from '../src/checkpoints/manager.js';

/**
 * Provider de prueba que devuelve outputs predecibles según la fase.
 * No hace llamadas de red.
 */
class MockProvider implements AIProvider {
  readonly id = 'anthropic' as const;
  readonly displayName = 'Mock';
  readonly defaultModel = 'mock-model';
  public calls: Array<{ messages: ChatMessage[]; system?: string }> = [];
  public responses: string[] = [];
  private nextResponseIndex = 0;

  setResponses(responses: string[]) {
    this.responses = responses;
    this.nextResponseIndex = 0;
  }

  async complete(messages: ChatMessage[], options?: { system?: string }): Promise<string> {
    this.calls.push({ messages, system: options?.system });
    const response = this.responses[this.nextResponseIndex] ?? '';
    this.nextResponseIndex++;
    return response;
  }
}

describe('Orchestrator', () => {
  let dir: string;
  let provider: MockProvider;
  let approvedCheckpoints: string[];
  let checkpointHandler: CheckpointHandler;

  beforeEach(() => {
    dir = mkdtempSync(resolve(tmpdir(), 'iagentek-orch-'));
    provider = new MockProvider();
    approvedCheckpoints = [];
    checkpointHandler = async (ctx) => {
      approvedCheckpoints.push(ctx.id);
      return { decision: 'approve' };
    };
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('runs the discovery phase and writes parsed file artifacts', async () => {
    const cfgMgr = new ConfigManager(dir);
    const config = cfgMgr.defaultConfig('test-app', 'anthropic', 'greenfield');
    cfgMgr.save(config);

    const flow = loadFlowDefinition('greenfield');
    // Solo nos interesa probar las primeras 1-2 fases en el test
    const minimalFlow = { ...flow, phases: flow.phases.slice(0, 1) };

    provider.setResponses([
      [
        '```file:.iagentek/project-brief.md',
        '# Project Brief: test-app',
        '',
        'Mock content for the brief.',
        '```',
        '',
        '```file:.iagentek/constitution.md',
        '# Constitution',
        '',
        'Principle 1',
        '```',
      ].join('\n'),
    ]);

    const orchestrator = new Orchestrator({
      projectDir: dir,
      config,
      flow: minimalFlow,
      provider,
      checkpointHandler,
      userIdea: 'una app de prueba',
    });

    await orchestrator.run();

    // Verificamos que se escribieron los archivos del agente
    expect(existsSync(resolve(dir, '.iagentek/project-brief.md'))).toBe(true);
    expect(existsSync(resolve(dir, '.iagentek/constitution.md'))).toBe(true);
    expect(readFileSync(resolve(dir, '.iagentek/project-brief.md'), 'utf-8')).toContain(
      'test-app'
    );

    // Verificamos que se guardó la transcripción
    expect(existsSync(resolve(dir, '.iagentek/.transcripts/discovery.md'))).toBe(true);

    // Verificamos que el checkpoint se ejecutó
    expect(approvedCheckpoints).toContain('discovery-approved');

    // El estado debe reflejar que la fase está completa
    const stateContent = JSON.parse(
      readFileSync(resolve(dir, '.iagentek/state.json'), 'utf-8')
    );
    expect(stateContent.completedPhases).toContain('discovery');
  });

  it('pauses the cycle if the checkpoint is rejected', async () => {
    const cfgMgr = new ConfigManager(dir);
    const config = cfgMgr.defaultConfig('test-app', 'anthropic', 'greenfield');
    cfgMgr.save(config);

    const flow = loadFlowDefinition('greenfield');
    const twoPhases = { ...flow, phases: flow.phases.slice(0, 2) };

    provider.setResponses([
      '```file:.iagentek/project-brief.md\n# Brief\n```',
      '```file:.iagentek/PRD.md\n# PRD\n```',
    ]);

    const rejecting: CheckpointHandler = async () => ({ decision: 'reject' });

    const orchestrator = new Orchestrator({
      projectDir: dir,
      config,
      flow: twoPhases,
      provider,
      checkpointHandler: rejecting,
      userIdea: 'idea',
    });

    await orchestrator.run();

    // Sólo se debió haber llamado al provider para la primera fase, no la segunda
    expect(provider.calls).toHaveLength(1);
    expect(existsSync(resolve(dir, '.iagentek/project-brief.md'))).toBe(true);
    expect(existsSync(resolve(dir, '.iagentek/PRD.md'))).toBe(false);
  });

  it('runs the builtin __codebase__ agent in brownfield without calling the LLM', async () => {
    const cfgMgr = new ConfigManager(dir);
    const config = cfgMgr.defaultConfig('brown', 'anthropic', 'brownfield');
    cfgMgr.save(config);

    const flow = loadFlowDefinition('brownfield');
    const onlyCodebase = { ...flow, phases: flow.phases.slice(0, 1) };

    const orchestrator = new Orchestrator({
      projectDir: dir,
      config,
      flow: onlyCodebase,
      provider,
      checkpointHandler,
    });

    await orchestrator.run();

    // El builtin no debe haber llamado al provider
    expect(provider.calls).toHaveLength(0);
    // Debe haber producido current-state.md
    expect(existsSync(resolve(dir, '.iagentek/current-state.md'))).toBe(true);
  });

  it('skips phases already marked completed in state', async () => {
    const cfgMgr = new ConfigManager(dir);
    const config = cfgMgr.defaultConfig('skip-test', 'anthropic', 'greenfield');
    cfgMgr.save(config);

    const flow = loadFlowDefinition('greenfield');
    const single = { ...flow, phases: flow.phases.slice(0, 1) };

    // Marca la fase como completada antes de correr
    const { StateManager } = await import('../src/state/manager.js');
    const stateMgr = new StateManager(dir);
    stateMgr.init('skip-test', 'greenfield');
    stateMgr.markPhaseCompleted('discovery');

    const orchestrator = new Orchestrator({
      projectDir: dir,
      config,
      flow: single,
      provider,
      checkpointHandler,
    });

    await orchestrator.run();

    expect(provider.calls).toHaveLength(0);
  });
});
