import { describe, it, expect } from 'vitest';
import {
  loadAgent,
  loadTemplate,
  loadFlow,
  listAgents,
  listTemplates,
  listFlows,
  AGENTS_DIR,
  TEMPLATES_DIR,
  FLOWS_DIR,
  type AgentRole,
} from '../src/index.js';
import { existsSync } from 'node:fs';

describe('@iagentek/method loaders', () => {
  it('exposes the three asset directories', () => {
    expect(existsSync(AGENTS_DIR)).toBe(true);
    expect(existsSync(TEMPLATES_DIR)).toBe(true);
    expect(existsSync(FLOWS_DIR)).toBe(true);
  });

  it('lists all 9 BMAD agents', () => {
    const agents = listAgents();
    expect(agents).toEqual(
      expect.arrayContaining([
        'analyst',
        'pm',
        'architect',
        'scrum-master',
        'dev',
        'qa',
        'devops',
        'debugger',
        'refactor-architect',
      ])
    );
  });

  it('lists all 4 flows', () => {
    const flows = listFlows();
    expect(flows).toEqual(
      expect.arrayContaining(['greenfield', 'brownfield', 'bugfix', 'refactor'])
    );
  });

  it('lists the SDD templates', () => {
    const templates = listTemplates();
    expect(templates).toEqual(
      expect.arrayContaining([
        'constitution',
        'project-brief',
        'PRD',
        'spec',
        'plan',
        'tasks',
        'story',
        'architecture',
        'current-state',
      ])
    );
  });

  describe('loadAgent', () => {
    const expectedAgents: AgentRole[] = [
      'analyst',
      'pm',
      'architect',
      'scrum-master',
      'dev',
      'qa',
      'devops',
      'debugger',
      'refactor-architect',
    ];

    for (const role of expectedAgents) {
      it(`loads the "${role}" agent with non-trivial prompt`, () => {
        const agent = loadAgent(role);
        expect(agent.role).toBe(role);
        expect(agent.prompt.length).toBeGreaterThan(200);
        expect(agent.prompt.toLowerCase()).toMatch(/identity|principles/);
      });
    }
  });

  it('loadFlow returns YAML content for greenfield', () => {
    const raw = loadFlow('greenfield');
    expect(raw).toMatch(/name:\s*greenfield/);
    expect(raw).toMatch(/phases:/);
  });

  it('loadTemplate returns markdown content for spec', () => {
    const raw = loadTemplate('spec');
    expect(raw).toMatch(/# Spec/);
  });

  it('throws on unknown agent', () => {
    expect(() => loadAgent('nonexistent' as AgentRole)).toThrow();
  });
});
