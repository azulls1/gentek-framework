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

export class CheckpointManager {
  constructor(
    private config: IAgentekConfig,
    private state: StateManager,
    private handler: CheckpointHandler
  ) {}

  async run(
    id: string,
    phaseId: string,
    prompt: string,
    summary: string,
    outputs: string[] = []
  ): Promise<CheckpointDecision> {
    const mode = this.config.checkpoints[id] ?? 'required';

    if (mode === 'skip') {
      this.state.recordCheckpoint(id, 'skipped by config');
      return 'approve';
    }

    if (mode === 'auto' && this.config.mode === 'fully-autonomous') {
      this.state.recordCheckpoint(id, 'auto-approved (fully-autonomous mode)');
      return 'approve';
    }

    const result = await this.handler({ id, phaseId, prompt, summary, outputs });
    if (result.decision === 'approve') {
      this.state.recordCheckpoint(id, result.notes);
    }
    return result.decision;
  }
}
