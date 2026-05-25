import { ConfigManager, StateManager, logger } from '@gentek/core';
import kleur from 'kleur';
import { runCycle } from './cycle.js';

export interface ResumeOptions {
  cwd?: string;
}

export async function runResume(opts: ResumeOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const config = new ConfigManager(cwd);
  const state = new StateManager(cwd);

  if (!config.exists() || !state.exists()) {
    logger.error('No hay proyecto Gentek aquí. Corre primero: npx @gentek/cli init');
    return;
  }

  const s = state.load();
  if (s.currentPhase) {
    logger.info(kleur.bold(`▶  Retomando desde fase: ${s.currentPhase}`));
  } else if (s.completedPhases.length > 0) {
    logger.info(kleur.bold(`▶  Continuando desde la siguiente fase pendiente`));
  } else {
    logger.info(kleur.bold(`▶  Ningún progreso previo — arrancando desde el inicio`));
  }
  console.log();

  await runCycle({ cwd });
}
