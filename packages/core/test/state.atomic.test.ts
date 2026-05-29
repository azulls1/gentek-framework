import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { StateManager, cleanupStaleTmps, atomicWriteFile } from '../src/state/manager.js';

describe('StateManager — atomic writes (v0.4.5)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(resolve(tmpdir(), 'iagentek-atomic-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('save → load round-trips correctly', () => {
    const mgr = new StateManager(dir);
    const initial = mgr.init('my-proj', 'greenfield');
    const fresh = new StateManager(dir);
    const loaded = fresh.load();
    expect(loaded.projectName).toBe('my-proj');
    expect(loaded.flow).toBe('greenfield');
    expect(loaded.createdAt).toBe(initial.createdAt);
  });

  it('does not leave .tmp files behind on a successful save', () => {
    const mgr = new StateManager(dir);
    mgr.init('clean', 'greenfield');
    mgr.markPhaseCompleted('discovery');
    mgr.markPhaseCompleted('definition');

    const stateDir = join(dir, '.iagentek');
    const leftovers = readdirSync(stateDir).filter((f) => f.endsWith('.tmp'));
    expect(leftovers).toEqual([]);
  });

  it('multiple consecutive saves do not collide (unique PID+hex per write)', () => {
    const mgr = new StateManager(dir);
    mgr.init('rapid', 'greenfield');
    for (let i = 0; i < 20; i++) {
      mgr.setCurrentPhase(`phase-${i}`);
    }
    const final = new StateManager(dir).load();
    expect(final.currentPhase).toBe('phase-19');
  });

  it('concurrent saves (Promise.all) both complete without error; last wins', async () => {
    const mgr = new StateManager(dir);
    mgr.init('concurrent', 'greenfield');
    await Promise.all([
      Promise.resolve().then(() => mgr.setCurrentPhase('A')),
      Promise.resolve().then(() => mgr.setCurrentPhase('B')),
      Promise.resolve().then(() => mgr.setCurrentPhase('C')),
    ]);
    const loaded = new StateManager(dir).load();
    expect(['A', 'B', 'C']).toContain(loaded.currentPhase);
  });

  it('cleanupStaleTmps removes a >60s-old matching tmp file', () => {
    const mgr = new StateManager(dir);
    mgr.init('cleanup', 'greenfield');
    const statePath = join(dir, '.iagentek', 'state.json');
    const staleTmp = `${statePath}.99999.deadbe.tmp`;
    writeFileSync(staleTmp, '{}');
    // Set mtime to 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 3600_000);
    utimesSync(staleTmp, twoHoursAgo, twoHoursAgo);

    cleanupStaleTmps(statePath);
    expect(existsSync(staleTmp)).toBe(false);
  });

  it('cleanupStaleTmps does NOT remove a recent (<60s) tmp file', () => {
    const mgr = new StateManager(dir);
    mgr.init('cleanup-recent', 'greenfield');
    const statePath = join(dir, '.iagentek', 'state.json');
    const recentTmp = `${statePath}.99998.abc123.tmp`;
    writeFileSync(recentTmp, '{}');

    cleanupStaleTmps(statePath);
    expect(existsSync(recentTmp)).toBe(true);
  });

  it('cleanupStaleTmps ignores files that do not match the tmp pattern', () => {
    const mgr = new StateManager(dir);
    mgr.init('cleanup-ignore', 'greenfield');
    const stateDir = join(dir, '.iagentek');
    const unrelated = join(stateDir, 'state.json.backup');
    writeFileSync(unrelated, 'preserve me');
    const twoHoursAgo = new Date(Date.now() - 2 * 3600_000);
    utimesSync(unrelated, twoHoursAgo, twoHoursAgo);

    cleanupStaleTmps(join(stateDir, 'state.json'));
    expect(existsSync(unrelated)).toBe(true);
  });

  it('handles project paths containing spaces', () => {
    const spaceDir = mkdtempSync(resolve(tmpdir(), 'ia gentek with spaces '));
    try {
      const mgr = new StateManager(spaceDir);
      mgr.init('spacey', 'greenfield');
      const loaded = new StateManager(spaceDir).load();
      expect(loaded.projectName).toBe('spacey');
    } finally {
      rmSync(spaceDir, { recursive: true, force: true });
    }
  });

  it('preserves UTF-8 / Unicode (including bidi marks) in notes field across save', () => {
    const mgr = new StateManager(dir);
    mgr.init('unicode', 'greenfield');
    // Includes accented chars, emoji, and an RTL embed mark.
    const notes = 'aprobé el design ✅ con notas‮ inversas‬';
    mgr.recordCheckpoint('discovery-approved', notes);
    const loaded = new StateManager(dir).load();
    expect(loaded.checkpoints[0].notes).toBe(notes);
  });

  it('atomicWriteFile creates the parent directory if missing', () => {
    const nested = join(dir, 'deep', 'nested', 'file.json');
    atomicWriteFile(nested, '{"hello":"world"}\n');
    expect(existsSync(nested)).toBe(true);
    expect(JSON.parse(readFileSync(nested, 'utf-8')).hello).toBe('world');
  });
});
