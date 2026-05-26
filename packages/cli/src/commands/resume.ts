import { ConfigManager, StateManager, logger } from '@iagentek/core';
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
    logger.error('No IAgentek project here. Run first: npx @iagentek/cli init');
    return;
  }

  const s = state.load();
  if (s.currentPhase) {
    logger.info(kleur.bold(`▶  Resuming from phase: ${s.currentPhase}`));
  } else if (s.completedPhases.length > 0) {
    logger.info(kleur.bold(`▶  Continuing from the next pending phase`));
  } else {
    logger.info(kleur.bold(`▶  No prior progress — starting from scratch`));
  }
  console.log();

  await runCycle({ cwd });
}
