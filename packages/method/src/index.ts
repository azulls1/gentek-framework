import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Assets live at the package root, one level up from dist/
export const ASSETS_DIR = resolve(__dirname, '..', 'assets');

export const AGENTS_DIR = resolve(ASSETS_DIR, 'agents');
export const TEMPLATES_DIR = resolve(ASSETS_DIR, 'templates');
export const FLOWS_DIR = resolve(ASSETS_DIR, 'flows');

export type AgentRole =
  | 'analyst'
  | 'pm'
  | 'architect'
  | 'scrum-master'
  | 'dev'
  | 'qa'
  | 'devops'
  | 'debugger'
  | 'refactor-architect';

export interface AgentDefinition {
  role: AgentRole;
  name: string;
  prompt: string;
}

export function loadAgent(role: AgentRole): AgentDefinition {
  const path = resolve(AGENTS_DIR, `${role}.md`);
  const prompt = readFileSync(path, 'utf-8');
  return {
    role,
    name: role.charAt(0).toUpperCase() + role.slice(1).replace('-', ' '),
    prompt,
  };
}

export function loadTemplate(name: string): string {
  const path = resolve(TEMPLATES_DIR, `${name}.md`);
  return readFileSync(path, 'utf-8');
}

export function loadFlow(name: string): string {
  const path = resolve(FLOWS_DIR, `${name}.yaml`);
  return readFileSync(path, 'utf-8');
}

export function listAgents(): string[] {
  return readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace('.md', ''));
}

export function listTemplates(): string[] {
  return readdirSync(TEMPLATES_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace('.md', ''));
}

export function listFlows(): string[] {
  return readdirSync(FLOWS_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => f.replace('.yaml', ''));
}
