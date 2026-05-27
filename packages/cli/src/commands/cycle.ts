import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import prompts from 'prompts';
import kleur from 'kleur';
import {
  ConfigManager,
  Orchestrator,
  createProvider,
  loadFlowDefinition,
  logger,
  type CheckpointHandler,
} from '@iagentek/core';
import type { Lang } from '@iagentek/method';

export interface CycleOptions {
  cwd?: string;
  flow?: string;
  idea?: string;
  lang?: Lang;
}

export async function runCycle(opts: CycleOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();

  // Load .env if present (no extra dependency — manual parse)
  loadDotEnvFile(cwd);

  const configMgr = new ConfigManager(cwd);
  if (!configMgr.exists()) {
    logger.error('No .iagentek/config.yaml found. Run first: npx @iagentek/cli init');
    return;
  }
  const config = configMgr.load();
  if (opts.lang) {
    config.language = opts.lang;
  }
  const flowName = opts.flow ?? config.flow;
  const flow = loadFlowDefinition(flowName, config.language);

  logger.header(`\n🔁 IAgentek cycle — ${flow.name}  (project: ${config.projectName})\n`);
  logger.dim(`Provider: ${config.provider.id}  |  Mode: ${config.mode}  |  Lang: ${config.language}`);
  logger.dim(`Enabled phases: ${flow.phases.filter((p) => p.enabled !== false).length}/${flow.phases.length}`);
  console.log();

  const provider = createProvider({
    id: config.provider.id,
    model: config.provider.model,
    apiKey: config.provider.apiKeyEnv ? process.env[config.provider.apiKeyEnv] : undefined,
  });

  let userIdea = opts.idea;
  if (!userIdea && !alreadyHasBrief(cwd)) {
    const { idea } = await prompts({
      type: 'text',
      name: 'idea',
      message: 'Describe the product idea (1-3 sentences)',
    });
    userIdea = idea;
  }

  const checkpointHandler: CheckpointHandler = async (ctx) => {
    console.log();
    logger.header(`🚦 Checkpoint: ${ctx.id}`);
    logger.info(ctx.prompt);
    console.log();
    logger.dim(ctx.summary);
    console.log();

    const { decision } = await prompts({
      type: 'select',
      name: 'decision',
      message: 'How do we proceed?',
      choices: [
        { title: kleur.green('Approve and continue'), value: 'approve' },
        { title: kleur.yellow('Pause (I will edit manually and resume)'), value: 'reject' },
      ],
      initial: 0,
    });

    if (decision === 'approve') {
      const { notes } = await prompts({
        type: 'text',
        name: 'notes',
        message: 'Notes (optional, ENTER to skip):',
      });
      return { decision: 'approve', notes };
    }
    return { decision: 'reject' };
  };

  const orchestrator = new Orchestrator({
    projectDir: cwd,
    config,
    flow,
    provider,
    checkpointHandler,
    userIdea,
    onAgentOutput: (phaseId, output) => {
      logger.dim(`  (agent output saved at .iagentek/.transcripts/${phaseId}.md, ${output.length} chars)`);
    },
  });

  await orchestrator.run();
}

function alreadyHasBrief(cwd: string): boolean {
  return existsSync(resolve(cwd, '.iagentek', 'project-brief.md'));
}

/**
 * Allowlist of environment variable names we are willing to import from a
 * project-local `.env`. Anything else (PATH, NODE_OPTIONS, LD_PRELOAD, etc.)
 * is ignored — a malicious `.env` committed to a repo cannot influence the
 * iagentek process by setting arbitrary env variables.
 */
const DOTENV_ALLOWED_EXACT = new Set([
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'DEEPSEEK_API_KEY',
  'OLLAMA_HOST',
]);
const DOTENV_ALLOWED_PATTERN = /^[A-Z][A-Z0-9_]*(?:_API_KEY|_TOKEN|_SECRET)$/;

export function isDotEnvKeyAllowed(key: string): boolean {
  if (DOTENV_ALLOWED_EXACT.has(key)) return true;
  return DOTENV_ALLOWED_PATTERN.test(key);
}

/**
 * Lightweight .env loader: KEY=VALUE per line, no quoting magic.
 * Avoids adding a dotenv dependency.
 *
 * Security: only keys matching the allowlist (provider API keys / generic
 * *_API_KEY / *_TOKEN / *_SECRET / OLLAMA_HOST) are imported. Anything else
 * is silently skipped — see DOTENV_ALLOWED_*.
 */
function loadDotEnvFile(cwd: string): void {
  const path = resolve(cwd, '.env');
  if (!existsSync(path)) return;
  const content = readFileSync(path, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!isDotEnvKeyAllowed(key)) continue;
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
