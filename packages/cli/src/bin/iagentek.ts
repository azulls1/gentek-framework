#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runInit } from '../commands/init.js';
import { runCycle } from '../commands/cycle.js';
import { runStatus } from '../commands/status.js';
import { runResume } from '../commands/resume.js';
import { runAgent } from '../commands/agent.js';
import { logger } from '@iagentek/core';

// Read version from package.json at runtime so it stays in sync with the published package
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, '..', '..', 'package.json');
const { version } = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };

const program = new Command();

program
  .name('iagentek')
  .description('Autonomous AI-assisted development framework (SDD + BMAD)')
  .version(version);

program
  .command('init [name]')
  .description('Bootstrap a new IAgentek project (.iagentek/ + config)')
  .option('-p, --provider <id>', 'AI provider (claude-cli, anthropic, openai, ...)')
  .option('-f, --flow <name>', 'Initial flow (greenfield, brownfield, bugfix, refactor)', 'greenfield')
  .option('--cwd <dir>', 'Project directory', process.cwd())
  .action(async (name, options) => {
    try {
      await runInit({ name, ...options });
    } catch (err) {
      logger.error(`init failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('cycle')
  .description('Run the full cycle of the configured flow with checkpoints')
  .option('--cwd <dir>', 'Project directory', process.cwd())
  .option('--flow <name>', 'Force a specific flow (override config)')
  .option('--idea <text>', 'Initial project idea (for discovery)')
  .action(async (options) => {
    try {
      await runCycle(options);
    } catch (err) {
      logger.error(`cycle failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show current phase, approved checkpoints, and next steps')
  .option('--cwd <dir>', 'Project directory', process.cwd())
  .action(async (options) => {
    try {
      await runStatus(options);
    } catch (err) {
      logger.error(`status failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('resume')
  .description('Resume the cycle from the last in-progress or paused phase')
  .option('--cwd <dir>', 'Project directory', process.cwd())
  .action(async (options) => {
    try {
      await runResume(options);
    } catch (err) {
      logger.error(`resume failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('agent [role]')
  .description('Invoke a single BMAD agent in isolation with the current project context (analyst, pm, architect, scrum-master, dev, qa, devops, debugger, refactor-architect)')
  .option('--cwd <dir>', 'Project directory', process.cwd())
  .option('--prompt <text>', 'Extra instruction for the agent')
  .action(async (role, options) => {
    try {
      await runAgent({ role, ...options });
    } catch (err) {
      logger.error(`agent failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
