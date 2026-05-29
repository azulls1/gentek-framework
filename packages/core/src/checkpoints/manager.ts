import type { IAgentekConfig } from '../config/loader.js';
import type { StateManager } from '../state/manager.js';

export type CheckpointDecision = 'approve' | 'reject' | 'edit';

export interface CheckpointContext {
  id: string;
  phaseId: string;
  prompt: string;
  summary: string;
  outputs: string[];
}

export interface CheckpointHandler {
  (ctx: CheckpointContext): Promise<{ decision: CheckpointDecision; notes?: string }>;
}

export interface CheckpointResult {
  decision: CheckpointDecision;
  notes?: string;
}

export class CheckpointManager {
  // `state` is intentionally kept in the constructor signature for backwards
  // source-compatibility — call sites that built CheckpointManager with three
  // args don't break — but as of v0.4.5 this class no longer mutates state.
  // The orchestrator owns the unified checkpoint+phase save so the two writes
  // can no longer drift apart on a crash.
  constructor(
    private config: IAgentekConfig,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private state: StateManager,
    private handler: CheckpointHandler
  ) {}

  async run(
    id: string,
    phaseId: string,
    prompt: string,
    summary: string,
    outputs: string[] = []
  ): Promise<CheckpointResult> {
    const mode = this.config.checkpoints[id] ?? 'required';

    if (mode === 'skip') {
      return { decision: 'approve', notes: 'skipped by config' };
    }

    if (mode === 'auto' && this.config.mode === 'fully-autonomous') {
      return { decision: 'approve', notes: 'auto-approved (fully-autonomous mode)' };
    }

    const result = await this.handler({ id, phaseId, prompt, summary, outputs });
    return { decision: result.decision, notes: result.notes };
  }
}
