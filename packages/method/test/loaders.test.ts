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

  describe('bilingual support', () => {
    it('loads English agent by default', async () => {
      const agent = loadAgent('analyst');
      expect(agent.lang).toBe('en');
      expect(agent.prompt.toLowerCase()).toContain('identity');
    });

    it('loads Spanish agent when lang=es', () => {
      const agent = loadAgent('analyst', 'es');
      expect(agent.lang).toBe('es');
      expect(agent.prompt.toLowerCase()).toContain('identidad');
    });

    it('loads English template by default', () => {
      const tpl = loadTemplate('project-brief');
      expect(tpl).toContain('Project Brief');
      expect(tpl).toContain('The problem');
    });

    it('loads Spanish template when lang=es', () => {
      const tpl = loadTemplate('project-brief', 'es');
      expect(tpl).toContain('Project Brief');
      expect(tpl).toContain('El problema');
    });

    it('loads English flow by default', () => {
      const yaml = loadFlow('greenfield');
      expect(yaml).toContain('Full cycle for a brand-new product');
    });

    it('loads Spanish flow when lang=es', () => {
      const yaml = loadFlow('greenfield', 'es');
      expect(yaml).toContain('Ciclo completo para producto nuevo');
    });

    it('exposes SUPPORTED_LANGS and DEFAULT_LANG', async () => {
      const mod = await import('../src/index.js');
      expect(mod.SUPPORTED_LANGS).toEqual(['en', 'es']);
      expect(mod.DEFAULT_LANG).toBe('en');
    });

    it('detectSystemLang returns es when LANG starts with es', async () => {
      const original = process.env.LANG;
      process.env.LANG = 'es_MX.UTF-8';
      const mod = await import('../src/index.js');
      expect(mod.detectSystemLang()).toBe('es');
      process.env.LANG = original;
    });
  });
});
