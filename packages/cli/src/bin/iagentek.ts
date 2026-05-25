#!/usr/bin/env node
import { Command } from 'commander';
import { runInit } from '../commands/init.js';
import { runCycle } from '../commands/cycle.js';
import { runStatus } from '../commands/status.js';
import { runResume } from '../commands/resume.js';
import { runAgent } from '../commands/agent.js';
import { logger } from '@iagentek/core';

const program = new Command();

program
  .name('iagentek')
  .description('Framework de desarrollo autónomo asistido por IA (SDD + BMAD)')
  .version('0.1.0');

program
  .command('init [name]')
  .description('Bootstrap de un nuevo proyecto IAgentek (.iagentek/ + config)')
  .option('-p, --provider <id>', 'Provider de IA (claude-cli, anthropic, openai, ...)')
  .option('-f, --flow <name>', 'Flow inicial (greenfield, brownfield)', 'greenfield')
  .option('--cwd <dir>', 'Directorio del proyecto', process.cwd())
  .action(async (name, options) => {
    try {
      await runInit({ name, ...options });
    } catch (err) {
      logger.error(`init falló: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('cycle')
  .description('Ejecuta el ciclo completo del flow configurado con checkpoints')
  .option('--cwd <dir>', 'Directorio del proyecto', process.cwd())
  .option('--flow <name>', 'Forzar un flow específico (override config)')
  .option('--idea <text>', 'Idea inicial del proyecto (para discovery)')
  .action(async (options) => {
    try {
      await runCycle(options);
    } catch (err) {
      logger.error(`cycle falló: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Muestra la fase actual, checkpoints aprobados y próximos pasos')
  .option('--cwd <dir>', 'Directorio del proyecto', process.cwd())
  .action(async (options) => {
    try {
      await runStatus(options);
    } catch (err) {
      logger.error(`status falló: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('resume')
  .description('Retoma el ciclo desde la última fase en curso o pausada')
  .option('--cwd <dir>', 'Directorio del proyecto', process.cwd())
  .action(async (options) => {
    try {
      await runResume(options);
    } catch (err) {
      logger.error(`resume falló: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('agent [role]')
  .description('Invoca un agente BMAD aislado con el contexto actual (analyst, pm, architect, scrum-master, dev, qa, devops)')
  .option('--cwd <dir>', 'Directorio del proyecto', process.cwd())
  .option('--prompt <text>', 'Instrucción adicional para el agente')
  .action(async (role, options) => {
    try {
      await runAgent({ role, ...options });
    } catch (err) {
      logger.error(`agent falló: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
