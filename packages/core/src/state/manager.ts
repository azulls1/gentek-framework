import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export interface CheckpointRecord {
  id: string;
  approvedAt: string;
  notes?: string;
}

export interface GentekState {
  projectName: string;
  flow: string;
  currentPhase: string | null;
  completedPhases: string[];
  checkpoints: CheckpointRecord[];
  createdAt: string;
  updatedAt: string;
}

export class StateManager {
  private path: string;
  private state: GentekState | null = null;

  constructor(projectDir: string) {
    this.path = resolve(projectDir, '.gentek', 'state.json');
  }

  exists(): boolean {
    return existsSync(this.path);
  }

  load(): GentekState {
    if (this.state) return this.state;
    if (!this.exists()) {
      throw new Error(`No hay state.json en ${this.path}. ¿Corriste 'gentek init'?`);
    }
    this.state = JSON.parse(readFileSync(this.path, 'utf-8')) as GentekState;
    return this.state;
  }

  save(state: Partial<GentekState>): GentekState {
    const current = this.exists() ? this.load() : this.empty();
    const merged: GentekState = {
      ...current,
      ...state,
      updatedAt: new Date().toISOString(),
    };
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(merged, null, 2), 'utf-8');
    this.state = merged;
    return merged;
  }

  init(projectName: string, flow: string): GentekState {
    const now = new Date().toISOString();
    return this.save({
      projectName,
      flow,
      currentPhase: null,
      completedPhases: [],
      checkpoints: [],
      createdAt: now,
    });
  }

  recordCheckpoint(id: string, notes?: string): GentekState {
    const current = this.load();
    const checkpoints = [
      ...current.checkpoints,
      { id, approvedAt: new Date().toISOString(), notes },
    ];
    return this.save({ checkpoints });
  }

  markPhaseCompleted(phaseId: string): GentekState {
    const current = this.load();
    if (current.completedPhases.includes(phaseId)) return current;
    return this.save({
      completedPhases: [...current.completedPhases, phaseId],
      currentPhase: null,
    });
  }

  setCurrentPhase(phaseId: string): GentekState {
    return this.save({ currentPhase: phaseId });
  }

  private empty(): GentekState {
    return {
      projectName: '',
      flow: '',
      currentPhase: null,
      completedPhases: [],
      checkpoints: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
