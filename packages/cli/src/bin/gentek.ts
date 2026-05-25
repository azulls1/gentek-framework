#!/usr/bin/env node
import { Command } from 'commander';
import { runInit } from '../commands/init.js';
import { runCycle } from '../commands/cycle.js';
import { runStatus } from '../commands/status.js';
import { logger } from '@gentek/core';

const program = new Command();

program
  .name('gentek')
  .description('Framework de desarrollo autónomo asistido por IA (SDD + BMAD)')
  .version('0.1.0');

program
  .command('init [name]')
  .description('Bootstrap de un nuevo proyecto Gentek (.gentek/ + config)')
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

program.parseAsync(process.argv);
