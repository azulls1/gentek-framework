import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import prompts from 'prompts';
import kleur from 'kleur';
import {
  ConfigManager,
  StateManager,
  detectProviders,
  preferredProvider,
  logger,
  type ProviderId,
} from '@iagentek/core';
import { detectSystemLang, type Lang } from '@iagentek/method';

export interface InitOptions {
  name?: string;
  provider?: ProviderId;
  flow?: string;
  cwd?: string;
  lang?: Lang;
}

export async function runInit(opts: InitOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const projectDir = opts.name ? resolve(cwd, opts.name) : cwd;
  const projectName = opts.name ?? basename(projectDir);

  logger.header(`\n🚀 Initializing IAgentek at: ${projectDir}\n`);

  if (opts.name && !existsSync(projectDir)) {
    mkdirSync(projectDir, { recursive: true });
  }

  // Detect existing .iagentek
  const config = new ConfigManager(projectDir);
  if (config.exists()) {
    logger.warn('A .iagentek/config.yaml already exists in this directory.');
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: 'Overwrite existing configuration?',
      initial: false,
    });
    if (!overwrite) {
      logger.info('Init cancelled. Your current configuration is untouched.');
      return;
    }
  }

  // Language selection
  let language: Lang;
  if (opts.lang) {
    language = opts.lang;
  } else if (opts.provider) {
    // Non-interactive mode (user passed --provider): use system locale, default English
    language = detectSystemLang();
  } else {
    const systemLang = detectSystemLang();
    const { selectedLang } = await prompts({
      type: 'select',
      name: 'selectedLang',
      message: 'Output language for generated artifacts',
      choices: [
        { title: 'English', value: 'en' },
        { title: 'Español', value: 'es' },
      ],
      initial: systemLang === 'es' ? 1 : 0,
    });
    language = selectedLang ?? 'en';
  }
  const langLabel = language === 'es' ? 'Español' : 'English';
  logger.info(kleur.gray(`  Language: ${langLabel}`));
  console.log();

  // Provider detection + selection
  const detection = detectProviders();
  const preferred = preferredProvider(detection);

  logger.info(kleur.bold('Detected providers:'));
  for (const d of detection) {
    const mark = d.available ? kleur.green('●') : kleur.gray('○');
    const note = d.note ? kleur.gray(`  (${d.note})`) : '';
    logger.info(`  ${mark} ${d.id}${note}`);
  }
  console.log();

  let providerId: ProviderId;
  if (opts.provider) {
    providerId = opts.provider;
  } else {
    const choices = detection.map((d) => ({
      title: d.available ? `${d.id} ${kleur.green('(available)')}` : `${d.id} ${kleur.gray('(not configured)')}`,
      value: d.id,
      disabled: !d.available,
    }));
    const { selected } = await prompts({
      type: 'select',
      name: 'selected',
      message: 'Choose the AI provider',
      choices,
      initial: preferred ? detection.indexOf(preferred) : 0,
    });
    if (!selected) {
      logger.error('No provider selected. Aborting.');
      return;
    }
    providerId = selected;
  }

  // If provider needs an API key and it's not in env, ask
  const envVar = envVarFor(providerId);
  if (envVar && !process.env[envVar]) {
    const { apiKey } = await prompts({
      type: 'password',
      name: 'apiKey',
      message: `${envVar} not in environment. Paste it here (will be saved to .env, gitignored):`,
    });
    if (apiKey) {
      writeEnvFile(projectDir, envVar, apiKey);
      logger.success(`  ✅ ${envVar} saved at ${projectDir}\\.env`);
    } else {
      logger.warn(`  ⚠️  No API key saved. You'll need to export ${envVar} before running 'iagentek cycle'.`);
    }
  }

  // Always ensure the project .gitignore protects framework-local secrets and
  // runtime state — even when .gitignore already exists from a brownfield repo.
  ensureGitignoreEntries(projectDir);

  // Create config + state
  const cfg = config.defaultConfig(projectName, providerId, opts.flow ?? 'greenfield', language);
  config.save(cfg);

  const state = new StateManager(projectDir);
  state.init(projectName, cfg.flow);

  // Pre-create directory structure
  const dirs = ['.iagentek/specs', '.iagentek/plans', '.iagentek/stories', '.iagentek/tasks', '.iagentek/.transcripts'];
  dirs.forEach((d) => mkdirSync(resolve(projectDir, d), { recursive: true }));

  logger.success(`\n✅ Project initialized.\n`);
  logger.info(kleur.bold('Structure created:'));
  logger.info(`  .iagentek/config.yaml       — flow + provider configuration`);
  logger.info(`  .iagentek/state.json        — phase + checkpoint tracking`);
  logger.info(`  .iagentek/specs/            — SDD specs per feature`);
  logger.info(`  .iagentek/plans/            — technical plans per feature`);
  logger.info(`  .iagentek/stories/          — user stories`);
  logger.info(`  .iagentek/tasks/            — atomic tasks`);
  console.log();
  logger.info(kleur.bold('Next step:'));
  if (opts.name) {
    logger.info(`  cd ${opts.name}`);
  }
  logger.info(`  npx @iagentek/cli cycle --idea "describe your idea here"`);
  console.log();
}

function envVarFor(id: ProviderId): string | undefined {
  switch (id) {
    case 'anthropic':
      return 'ANTHROPIC_API_KEY';
    case 'openai':
      return 'OPENAI_API_KEY';
    case 'gemini':
      return 'GEMINI_API_KEY';
    case 'deepseek':
      return 'DEEPSEEK_API_KEY';
    default:
      return undefined;
  }
}

function writeEnvFile(projectDir: string, key: string, value: string): void {
  const envPath = resolve(projectDir, '.env');
  let existing = '';
  if (existsSync(envPath)) {
    existing = readFileSync(envPath, 'utf-8');
  }
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(existing)) {
    existing = existing.replace(regex, `${key}=${value}`);
  } else {
    existing += (existing.endsWith('\n') || existing === '' ? '' : '\n') + `${key}=${value}\n`;
  }
  writeFileSync(envPath, existing, 'utf-8');
}

/**
 * Idempotently ensures the project's .gitignore contains every entry that could
 * leak sensitive runtime data (API keys in .env, prompt transcripts that may
 * contain user-pasted secrets, machine-local state). Works whether the file
 * exists or not. Brownfield-safe: never deduplicates or rewrites unrelated
 * existing entries.
 */
export function ensureGitignoreEntries(projectDir: string): void {
  const gitignorePath = resolve(projectDir, '.gitignore');
  const required = [
    '.env',
    '.env.local',
    '.iagentek/state.json',
    '.iagentek/.transcripts/',
    '.iagentek/.cache/',
  ];

  const existing = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf-8') : '';
  const existingLines = new Set(existing.split('\n').map((l) => l.trim()));

  const missing = required.filter((entry) => !existingLines.has(entry));
  if (missing.length === 0) return;

  const prefix = existing.length === 0 || existing.endsWith('\n') ? '' : '\n';
  const block = missing.join('\n') + '\n';
  writeFileSync(gitignorePath, existing + prefix + block, 'utf-8');
}
