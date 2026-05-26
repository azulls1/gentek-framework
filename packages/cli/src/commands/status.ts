import kleur from 'kleur';
import { ConfigManager, StateManager, loadFlowDefinition, logger } from '@iagentek/core';

export interface StatusOptions {
  cwd?: string;
}

export async function runStatus(opts: StatusOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const config = new ConfigManager(cwd).load();
  const state = new StateManager(cwd).load();
  const flow = loadFlowDefinition(config.flow);

  logger.header(`\n📊 IAgentek status — ${config.projectName}\n`);
  logger.info(`Flow:      ${config.flow}`);
  logger.info(`Provider:  ${config.provider.id}  (${config.provider.model})`);
  logger.info(`Mode:      ${config.mode}`);
  logger.info(`Created:   ${state.createdAt}`);
  logger.info(`Updated:   ${state.updatedAt}`);
  console.log();

  logger.header('Phases:');
  for (const phase of flow.phases) {
    if (phase.enabled === false) {
      logger.dim(`  ⊘  ${phase.name}  (disabled in this flow)`);
    } else if (state.completedPhases.includes(phase.id)) {
      logger.success(`  ✅ ${phase.name}`);
    } else if (state.currentPhase === phase.id) {
      logger.warn(`  ▶️  ${phase.name}  (in progress or paused)`);
    } else {
      logger.dim(`  ⏳ ${phase.name}`);
    }
  }
  console.log();

  if (state.checkpoints.length > 0) {
    logger.header('Approved checkpoints:');
    for (const c of state.checkpoints) {
      const notes = c.notes ? kleur.gray(`  — "${c.notes}"`) : '';
      logger.info(`  ✓ ${c.id}  ${kleur.dim(c.approvedAt)}${notes}`);
    }
    console.log();
  }

  if (state.currentPhase && !state.completedPhases.includes(state.currentPhase)) {
    logger.info(kleur.bold('Next step:'));
    logger.info(`  npx @iagentek/cli cycle  (resumes the current phase)`);
  } else if (state.completedPhases.length === flow.phases.filter((p) => p.enabled !== false).length) {
    logger.success('🎉 All enabled phases completed.');
  } else {
    logger.info(kleur.bold('Next step:'));
    logger.info(`  npx @iagentek/cli cycle`);
  }
}
