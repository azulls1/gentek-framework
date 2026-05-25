import { describe, it, expect } from 'vitest';
import { loadFlowDefinition, enabledPhases } from '../src/flow/loader.js';

describe('loadFlowDefinition', () => {
  it('loads greenfield with 7 phases', () => {
    const flow = loadFlowDefinition('greenfield');
    expect(flow.name).toBe('greenfield');
    expect(flow.phases.length).toBe(7);
    expect(flow.phases[0].id).toBe('discovery');
    expect(flow.phases[flow.phases.length - 1].id).toBe('release');
  });

  it('loads brownfield with 8 phases including codebase-analysis', () => {
    const flow = loadFlowDefinition('brownfield');
    expect(flow.name).toBe('brownfield');
    expect(flow.phases.length).toBe(8);
    expect(flow.phases[0].id).toBe('codebase-analysis');
    expect(flow.phases[0].agent).toBe('__codebase__');
  });

  it('loads bugfix as a short flow', () => {
    const flow = loadFlowDefinition('bugfix');
    expect(flow.phases.length).toBeLessThanOrEqual(5);
    expect(flow.phases.find((p) => p.agent === 'debugger')).toBeDefined();
  });

  it('loads refactor with refactor-architect agent', () => {
    const flow = loadFlowDefinition('refactor');
    expect(flow.phases.find((p) => p.agent === 'refactor-architect')).toBeDefined();
  });

  it('every phase has a checkpoint definition', () => {
    for (const flowName of ['greenfield', 'brownfield', 'bugfix', 'refactor']) {
      const flow = loadFlowDefinition(flowName);
      for (const phase of flow.phases) {
        expect(phase.checkpoint, `${flowName}:${phase.id} missing checkpoint`).toBeDefined();
        expect(phase.checkpoint!.id).toBeTruthy();
        expect(phase.checkpoint!.mode).toMatch(/^(required|auto|skip)$/);
      }
    }
  });

  it('enabledPhases filters out phases with enabled:false', () => {
    const flow = loadFlowDefinition('greenfield');
    // Forzamos algunas como deshabilitadas en memoria
    const modified = {
      ...flow,
      phases: flow.phases.map((p, i) => ({ ...p, enabled: i === 0 ? false : true })),
    };
    expect(enabledPhases(modified).length).toBe(flow.phases.length - 1);
  });
});
