import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { ConfigManager } from '../src/config/loader.js';
import { StateManager } from '../src/state/manager.js';

describe('ConfigManager', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(resolve(tmpdir(), 'gentek-config-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('exists() returns false on empty directory', () => {
    expect(new ConfigManager(dir).exists()).toBe(false);
  });

  it('load() throws if config does not exist', () => {
    expect(() => new ConfigManager(dir).load()).toThrow();
  });

  it('roundtrip: save and load returns equivalent config', () => {
    const mgr = new ConfigManager(dir);
    const cfg = mgr.defaultConfig('my-project', 'anthropic', 'greenfield');
    mgr.save(cfg);
    expect(mgr.exists()).toBe(true);
    const loaded = mgr.load();
    expect(loaded).toEqual(cfg);
  });

  it('defaultConfig sets the right env var per provider', () => {
    const mgr = new ConfigManager(dir);
    expect(mgr.defaultConfig('p', 'anthropic').provider.apiKeyEnv).toBe('ANTHROPIC_API_KEY');
    expect(mgr.defaultConfig('p', 'openai').provider.apiKeyEnv).toBe('OPENAI_API_KEY');
    expect(mgr.defaultConfig('p', 'gemini').provider.apiKeyEnv).toBe('GEMINI_API_KEY');
    expect(mgr.defaultConfig('p', 'deepseek').provider.apiKeyEnv).toBe('DEEPSEEK_API_KEY');
    expect(mgr.defaultConfig('p', 'claude-cli').provider.apiKeyEnv).toBeUndefined();
    expect(mgr.defaultConfig('p', 'ollama').provider.apiKeyEnv).toBeUndefined();
  });

  it('defaultConfig includes all 7 standard checkpoints', () => {
    const cfg = new ConfigManager(dir).defaultConfig('p', 'anthropic');
    expect(Object.keys(cfg.checkpoints)).toEqual(
      expect.arrayContaining([
        'discovery-approved',
        'specs-approved',
        'architecture-approved',
        'planning-approved',
        'story-done',
        'qa-approved',
        'release-approved',
      ])
    );
  });
});

describe('StateManager', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(resolve(tmpdir(), 'gentek-state-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('init creates state with empty progress', () => {
    const mgr = new StateManager(dir);
    const state = mgr.init('my-project', 'greenfield');
    expect(state.projectName).toBe('my-project');
    expect(state.flow).toBe('greenfield');
    expect(state.completedPhases).toEqual([]);
    expect(state.checkpoints).toEqual([]);
    expect(state.currentPhase).toBeNull();
  });

  it('setCurrentPhase updates state', () => {
    const mgr = new StateManager(dir);
    mgr.init('p', 'greenfield');
    const updated = mgr.setCurrentPhase('discovery');
    expect(updated.currentPhase).toBe('discovery');
  });

  it('markPhaseCompleted clears currentPhase and appends to completedPhases', () => {
    const mgr = new StateManager(dir);
    mgr.init('p', 'greenfield');
    mgr.setCurrentPhase('discovery');
    const updated = mgr.markPhaseCompleted('discovery');
    expect(updated.completedPhases).toContain('discovery');
    expect(updated.currentPhase).toBeNull();
  });

  it('markPhaseCompleted is idempotent', () => {
    const mgr = new StateManager(dir);
    mgr.init('p', 'greenfield');
    mgr.markPhaseCompleted('discovery');
    const updated = mgr.markPhaseCompleted('discovery');
    expect(updated.completedPhases.filter((p) => p === 'discovery')).toHaveLength(1);
  });

  it('recordCheckpoint appends with timestamp', () => {
    const mgr = new StateManager(dir);
    mgr.init('p', 'greenfield');
    const updated = mgr.recordCheckpoint('discovery-approved', 'looks good');
    expect(updated.checkpoints).toHaveLength(1);
    expect(updated.checkpoints[0].id).toBe('discovery-approved');
    expect(updated.checkpoints[0].notes).toBe('looks good');
    expect(updated.checkpoints[0].approvedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('load() returns persisted state across instances', () => {
    const m1 = new StateManager(dir);
    m1.init('persisted', 'brownfield');
    m1.markPhaseCompleted('codebase-analysis');

    const m2 = new StateManager(dir);
    const loaded = m2.load();
    expect(loaded.projectName).toBe('persisted');
    expect(loaded.completedPhases).toContain('codebase-analysis');
  });
});
