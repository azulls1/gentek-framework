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
} from '@gentek/core';

export interface InitOptions {
  name?: string;
  provider?: ProviderId;
  flow?: string;
  cwd?: string;
}

export async function runInit(opts: InitOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const projectDir = opts.name ? resolve(cwd, opts.name) : cwd;
  const projectName = opts.name ?? basename(projectDir);

  logger.header(`\n🚀 Inicializando Gentek en: ${projectDir}\n`);

  if (opts.name && !existsSync(projectDir)) {
    mkdirSync(projectDir, { recursive: true });
  }

  // Detect existing .gentek
  const config = new ConfigManager(projectDir);
  if (config.exists()) {
    logger.warn('Ya existe un .gentek/config.yaml en este directorio.');
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: '¿Sobrescribir configuración existente?',
      initial: false,
    });
    if (!overwrite) {
      logger.info('Init cancelado. Tu configuración actual sigue intacta.');
      return;
    }
  }

  // Provider detection + selection
  const detection = detectProviders();
  const preferred = preferredProvider(detection);

  logger.info(kleur.bold('Providers detectados:'));
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
      title: d.available ? `${d.id} ${kleur.green('(disponible)')}` : `${d.id} ${kleur.gray('(no configurado)')}`,
      value: d.id,
      disabled: !d.available,
    }));
    const { selected } = await prompts({
      type: 'select',
      name: 'selected',
      message: 'Elige el provider de IA',
      choices,
      initial: preferred ? detection.indexOf(preferred) : 0,
    });
    if (!selected) {
      logger.error('No seleccionaste provider. Aborto.');
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
      message: `${envVar} no está en el entorno. Pégala aquí (se guardará en .env, ignorado por git):`,
    });
    if (apiKey) {
      writeEnvFile(projectDir, envVar, apiKey);
      logger.success(`  ✅ ${envVar} guardada en ${projectDir}\\.env`);
      ensureGitignoreEnv(projectDir);
    } else {
      logger.warn(`  ⚠️  No se guardó API key. Tendrás que exportar ${envVar} antes de correr 'gentek cycle'.`);
    }
  }

  // Create config + state
  const cfg = config.defaultConfig(projectName, providerId, opts.flow ?? 'greenfield');
  config.save(cfg);

  const state = new StateManager(projectDir);
  state.init(projectName, cfg.flow);

  // Pre-create directory structure
  const dirs = ['.gentek/specs', '.gentek/plans', '.gentek/stories', '.gentek/tasks', '.gentek/.transcripts'];
  dirs.forEach((d) => mkdirSync(resolve(projectDir, d), { recursive: true }));

  logger.success(`\n✅ Proyecto inicializado.\n`);
  logger.info(kleur.bold('Estructura creada:'));
  logger.info(`  .gentek/config.yaml       — configuración del flow + provider`);
  logger.info(`  .gentek/state.json        — tracking de fases y checkpoints`);
  logger.info(`  .gentek/specs/            — specs SDD por feature`);
  logger.info(`  .gentek/plans/            — plans técnicos por feature`);
  logger.info(`  .gentek/stories/          — user stories (iteración 2)`);
  logger.info(`  .gentek/tasks/            — tasks atómicas (iteración 2)`);
  console.log();
  logger.info(kleur.bold('Próximo paso:'));
  if (opts.name) {
    logger.info(`  cd ${opts.name}`);
  }
  logger.info(`  npx @gentek/cli cycle --idea "describe tu idea aquí"`);
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

function ensureGitignoreEnv(projectDir: string): void {
  const gitignorePath = resolve(projectDir, '.gitignore');
  const line = '.env';
  let content = '';
  if (existsSync(gitignorePath)) {
    content = readFileSync(gitignorePath, 'utf-8');
    if (content.split('\n').some((l) => l.trim() === line)) return;
    content += (content.endsWith('\n') ? '' : '\n') + `${line}\n`;
  } else {
    content = `${line}\n.gentek/state.json\n.gentek/.transcripts/\n`;
  }
  writeFileSync(gitignorePath, content, 'utf-8');
}
