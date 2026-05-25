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

export interface CycleOptions {
  cwd?: string;
  flow?: string;
  idea?: string;
}

export async function runCycle(opts: CycleOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();

  // Load .env if present (no extra dependency — manual parse)
  loadDotEnvFile(cwd);

  const configMgr = new ConfigManager(cwd);
  if (!configMgr.exists()) {
    logger.error('No hay .iagentek/config.yaml. Corre primero: npx @iagentek/cli init');
    return;
  }
  const config = configMgr.load();
  const flowName = opts.flow ?? config.flow;
  const flow = loadFlowDefinition(flowName);

  logger.header(`\n🔁 IAgentek cycle — ${flow.name}  (proyecto: ${config.projectName})\n`);
  logger.dim(`Provider: ${config.provider.id}  |  Modo: ${config.mode}`);
  logger.dim(`Fases habilitadas: ${flow.phases.filter((p) => p.enabled !== false).length}/${flow.phases.length}`);
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
      message: 'Describe la idea del producto (1-3 frases)',
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
      message: '¿Cómo procedemos?',
      choices: [
        { title: kleur.green('Aprobar y continuar'), value: 'approve' },
        { title: kleur.yellow('Pausar (editaré manualmente y retomo con `resume`)'), value: 'reject' },
      ],
      initial: 0,
    });

    if (decision === 'approve') {
      const { notes } = await prompts({
        type: 'text',
        name: 'notes',
        message: 'Notas (opcional, ENTER para saltar):',
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
      logger.dim(`  (output del agente guardado en .iagentek/.transcripts/${phaseId}.md, ${output.length} chars)`);
    },
  });

  await orchestrator.run();
}

function alreadyHasBrief(cwd: string): boolean {
  return existsSync(resolve(cwd, '.iagentek', 'project-brief.md'));
}

/**
 * Lightweight .env loader: KEY=VALUE per line, no quoting magic.
 * Avoids adding a dotenv dependency.
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
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
