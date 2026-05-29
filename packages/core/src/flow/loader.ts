import yaml from 'js-yaml';
import { loadFlow, type Lang } from '@iagentek/method';

export interface PhaseDefinition {
  id: string;
  name: string;
  agent: string;
  enabled?: boolean;
  loop?: string;
  inputs?: string[];
  outputs?: string[];
  checkpoint?: {
    id: string;
    mode: 'required' | 'auto' | 'skip';
    prompt: string;
    summary_template?: string;
  };
}

export interface FlowDefinition {
  name: string;
  description: string;
  version: string;
  phases: PhaseDefinition[];
}

export function loadFlowDefinition(flowName: string, lang: Lang = 'en'): FlowDefinition {
  const raw = loadFlow(flowName, lang);
  const flow = yaml.load(raw) as FlowDefinition;
  validateUniqueCheckpointIds(flow);
  return flow;
}

export function enabledPhases(flow: FlowDefinition): PhaseDefinition[] {
  return flow.phases.filter((p) => p.enabled !== false);
}

/**
 * Ensures no two phases in a flow share the same `checkpoint.id`. The
 * orchestrator's crash-recovery reconcile (v0.4.5) maps each approved
 * checkpoint id back to a single phase id, so a duplicate would corrupt that
 * mapping and mark unrelated phases as completed.
 *
 * Exported for unit tests; called automatically by `loadFlowDefinition`.
 */
export function validateUniqueCheckpointIds(flow: FlowDefinition): void {
  const seenBy = new Map<string, string>();
  for (const phase of flow.phases) {
    const cp = phase.checkpoint;
    if (!cp) continue;
    const prior = seenBy.get(cp.id);
    if (prior) {
      throw new Error(
        `Flow '${flow.name}' has duplicate checkpoint.id '${cp.id}' (phases '${prior}' and '${phase.id}')`
      );
    }
    seenBy.set(cp.id, phase.id);
  }
}
