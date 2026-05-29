import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

export interface CheckpointRecord {
  id: string;
  approvedAt: string;
  notes?: string;
}

export interface IAgentekState {
  projectName: string;
  flow: string;
  currentPhase: string | null;
  completedPhases: string[];
  checkpoints: CheckpointRecord[];
  createdAt: string;
  updatedAt: string;
}

// Pattern used to recognize orphan tmp files produced by atomic writes that
// crashed before rename. Carries pid + 6 hex chars so concurrent processes
// never collide.
const TMP_FILENAME_PATTERN = /^state\.json\.\d+\.[0-9a-f]{6}\.tmp$/;

// Minimum age before a stale tmp is considered safe to clean. Anything newer
// could still belong to a live concurrent process. 60s is comfortably above
// any reasonable retry window.
const STALE_TMP_MIN_AGE_MS = 60_000;

// Retry policy for renameSync. Windows + antivirus + OneDrive sync can hold
// transient locks; total ~820ms window covers >99% of observed cases.
const RENAME_RETRY_DELAYS_MS = [10, 30, 80, 200, 500];
const RENAME_RETRYABLE_CODES = new Set(['EBUSY', 'EPERM', 'EACCES']);

export class StateManager {
  private path: string;
  private state: IAgentekState | null = null;

  constructor(projectDir: string) {
    this.path = resolve(projectDir, '.iagentek', 'state.json');
  }

  exists(): boolean {
    return existsSync(this.path);
  }

  load(): IAgentekState {
    cleanupStaleTmps(this.path);
    if (this.state) return this.state;
    if (!existsSync(this.path)) {
      throw new Error(`No state.json at ${this.path}. Did you run 'iagentek init'?`);
    }
    this.state = JSON.parse(readFileSync(this.path, 'utf-8')) as IAgentekState;
    return this.state;
  }

  save(state: Partial<IAgentekState>): IAgentekState {
    const current = existsSync(this.path) ? this.loadDisk() : this.empty();
    const merged: IAgentekState = {
      ...current,
      ...state,
      updatedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(merged, null, 2) + '\n';
    atomicWriteFile(this.path, json);
    this.state = merged;
    return merged;
  }

  init(projectName: string, flow: string): IAgentekState {
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

  recordCheckpoint(id: string, notes?: string): IAgentekState {
    const current = this.load();
    const checkpoints = [
      ...current.checkpoints,
      { id, approvedAt: new Date().toISOString(), notes },
    ];
    return this.save({ checkpoints });
  }

  markPhaseCompleted(phaseId: string): IAgentekState {
    const current = this.load();
    if (current.completedPhases.includes(phaseId)) return current;
    return this.save({
      completedPhases: [...current.completedPhases, phaseId],
      currentPhase: null,
    });
  }

  setCurrentPhase(phaseId: string): IAgentekState {
    return this.save({ currentPhase: phaseId });
  }

  // Bypasses the in-memory cache and reads from disk. Used inside save() to
  // get a fresh baseline for the merge, so concurrent saves from another
  // process (rare but possible) don't get silently dropped.
  private loadDisk(): IAgentekState {
    return JSON.parse(readFileSync(this.path, 'utf-8')) as IAgentekState;
  }

  private empty(): IAgentekState {
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

/**
 * Writes content to `finalPath` atomically: tmp file with unique name → fsync →
 * rename (with retry on transient Windows locks). If anything fails before the
 * rename, the original file is left untouched and the tmp is cleaned up.
 *
 * Exported for reuse by other writers in the memory subsystem (v0.4.6).
 */
export function atomicWriteFile(finalPath: string, content: string): void {
  const dir = dirname(finalPath);
  mkdirSync(dir, { recursive: true });
  const tmpPath = `${finalPath}.${process.pid}.${randomBytes(3).toString('hex')}.tmp`;

  // 'wx' fails if the path already exists. The PID + 6-hex suffix makes
  // collision impossible in practice, so a pre-existing tmp here means a real
  // problem we should not paper over.
  const fd = openSync(tmpPath, 'wx');
  try {
    writeSync(fd, content, 0, 'utf-8');
    try {
      fsyncSync(fd);
    } catch (e) {
      // Some network FS return EINVAL for fsync; rename remains the committer.
      if ((e as NodeJS.ErrnoException).code !== 'EINVAL') throw e;
    }
  } finally {
    closeSync(fd);
  }

  try {
    renameWithRetry(tmpPath, finalPath);
  } catch (e) {
    // Best-effort cleanup of our own tmp before propagating.
    try {
      unlinkSync(tmpPath);
    } catch {
      /* silent */
    }
    throw e;
  }

  // On POSIX, fsync the parent directory so the rename is durable across
  // power loss. No-op on Windows (opening a directory is not supported the
  // same way; MoveFileExW is durable enough for our needs).
  if (process.platform !== 'win32') {
    try {
      const dfd = openSync(dir, 'r');
      try {
        fsyncSync(dfd);
      } finally {
        closeSync(dfd);
      }
    } catch {
      /* silent — best-effort */
    }
  }
}

function renameWithRetry(src: string, dst: string): void {
  let lastErr: unknown;
  for (let i = 0; i <= RENAME_RETRY_DELAYS_MS.length; i++) {
    try {
      renameSync(src, dst);
      return;
    } catch (e) {
      lastErr = e;
      const code = (e as NodeJS.ErrnoException).code;
      if (i < RENAME_RETRY_DELAYS_MS.length && code && RENAME_RETRYABLE_CODES.has(code)) {
        const jitter = Math.floor(Math.random() * 20);
        sleepSync(RENAME_RETRY_DELAYS_MS[i] + jitter);
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr;
}

/**
 * Removes leftover `state.json.<pid>.<hex>.tmp` files older than the stale
 * threshold. Best-effort: every error is swallowed. Called from `load()` so
 * the user never has to clean these by hand.
 *
 * Exported for use by memory-subsystem writers that share the same pattern.
 */
export function cleanupStaleTmps(finalPath: string): void {
  const dir = dirname(finalPath);
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  const now = Date.now();
  for (const name of entries) {
    if (!TMP_FILENAME_PATTERN.test(name)) continue;
    const full = join(dir, name);
    try {
      const age = now - statSync(full).mtimeMs;
      if (age > STALE_TMP_MIN_AGE_MS) {
        unlinkSync(full);
      }
    } catch {
      /* silent */
    }
  }
}

// Sync sleep using Atomics. Used to back off renameSync retries without
// going through the event loop (we're in a sync code path).
function sleepSync(ms: number): void {
  const sab = new SharedArrayBuffer(4);
  const i32 = new Int32Array(sab);
  Atomics.wait(i32, 0, 0, ms);
}
