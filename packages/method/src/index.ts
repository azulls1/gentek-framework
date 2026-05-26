import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Assets live at the package root, one level up from dist/
export const ASSETS_DIR = resolve(__dirname, '..', 'assets');

export type Lang = 'en' | 'es';
export const SUPPORTED_LANGS: Lang[] = ['en', 'es'];
export const DEFAULT_LANG: Lang = 'en';

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
  lang: Lang;
}

function langDir(lang: Lang, kind: 'agents' | 'templates' | 'flows'): string {
  return resolve(ASSETS_DIR, lang, kind);
}

/**
 * Returns the requested asset path if it exists, otherwise falls back to the
 * English version. We require English to always exist as the canonical source.
 */
function resolveAssetPath(
  kind: 'agents' | 'templates' | 'flows',
  name: string,
  ext: string,
  lang: Lang
): string {
  const candidate = resolve(langDir(lang, kind), `${name}${ext}`);
  if (existsSync(candidate)) return candidate;
  // Fallback to English
  const fallback = resolve(langDir('en', kind), `${name}${ext}`);
  return fallback;
}

export function loadAgent(role: AgentRole, lang: Lang = DEFAULT_LANG): AgentDefinition {
  const path = resolveAssetPath('agents', role, '.md', lang);
  const prompt = readFileSync(path, 'utf-8');
  return {
    role,
    name: role.charAt(0).toUpperCase() + role.slice(1).replace('-', ' '),
    prompt,
    lang,
  };
}

export function loadTemplate(name: string, lang: Lang = DEFAULT_LANG): string {
  const path = resolveAssetPath('templates', name, '.md', lang);
  return readFileSync(path, 'utf-8');
}

export function loadFlow(name: string, lang: Lang = DEFAULT_LANG): string {
  const path = resolveAssetPath('flows', name, '.yaml', lang);
  return readFileSync(path, 'utf-8');
}

export function listAgents(lang: Lang = DEFAULT_LANG): string[] {
  return readdirSync(langDir(lang, 'agents'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace('.md', ''));
}

export function listTemplates(lang: Lang = DEFAULT_LANG): string[] {
  return readdirSync(langDir(lang, 'templates'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace('.md', ''));
}

export function listFlows(lang: Lang = DEFAULT_LANG): string[] {
  return readdirSync(langDir(lang, 'flows'))
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => f.replace('.yaml', ''));
}

/**
 * Detects a preferred language from the OS environment (LANG, LC_ALL).
 * Returns DEFAULT_LANG if no Spanish indicator is found.
 */
export function detectSystemLang(): Lang {
  const candidates = [process.env.LANG, process.env.LC_ALL, process.env.LC_MESSAGES]
    .filter(Boolean)
    .map((v) => v!.toLowerCase());
  for (const value of candidates) {
    if (value.startsWith('es') || value.includes('es_') || value.includes('-es')) return 'es';
  }
  return DEFAULT_LANG;
}

// Back-compat exports for existing paths (some code still references AGENTS_DIR etc.)
export const AGENTS_DIR = langDir(DEFAULT_LANG, 'agents');
export const TEMPLATES_DIR = langDir(DEFAULT_LANG, 'templates');
export const FLOWS_DIR = langDir(DEFAULT_LANG, 'flows');
