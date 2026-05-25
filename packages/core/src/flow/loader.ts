import yaml from 'js-yaml';
import { loadFlow } from '@iagentek/method';

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

export function loadFlowDefinition(flowName: string): FlowDefinition {
  const raw = loadFlow(flowName);
  return yaml.load(raw) as FlowDefinition;
}

export function enabledPhases(flow: FlowDefinition): PhaseDefinition[] {
  return flow.phases.filter((p) => p.enabled !== false);
}
