import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import prompts from 'prompts';
import { loadAgent, listAgents, type AgentRole } from '@iagentek/method';
import {
  ConfigManager,
  createProvider,
  logger,
  type ChatMessage,
} from '@iagentek/core';

export interface AgentOptions {
  role?: string;
  cwd?: string;
  prompt?: string;
}

export async function runAgent(opts: AgentOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  loadDotEnv(cwd);

  const configMgr = new ConfigManager(cwd);
  if (!configMgr.exists()) {
    logger.error('No hay .iagentek/config.yaml. Corre primero: npx @iagentek/cli init');
    return;
  }
  const config = configMgr.load();

  // Pick role
  const available = listAgents().filter((a) => !a.startsWith('__'));
  let role = opts.role;
  if (!role) {
    const { selected } = await prompts({
      type: 'select',
      name: 'selected',
      message: '¿Qué agente quieres invocar?',
      choices: available.map((a) => ({ title: a, value: a })),
    });
    role = selected;
  }
  if (!role || !available.includes(role)) {
    logger.error(`Agente desconocido: ${role}. Disponibles: ${available.join(', ')}`);
    return;
  }

  const agent = loadAgent(role as AgentRole);
  const provider = createProvider({
    id: config.provider.id,
    model: config.provider.model,
    apiKey: config.provider.apiKeyEnv ? process.env[config.provider.apiKeyEnv] : undefined,
  });

  // Build context from all .iagentek/* artifacts
  const context = buildAgentContext(cwd);

  let extraPrompt = opts.prompt;
  if (!extraPrompt) {
    const { p } = await prompts({
      type: 'text',
      name: 'p',
      message: '¿Instrucción extra para el agente? (ENTER para usar solo el contexto del proyecto)',
    });
    extraPrompt = p;
  }

  logger.header(`\n🧠 Invocando agente '${role}' con provider ${config.provider.id}\n`);

  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: [
        '# Contexto del proyecto',
        context,
        extraPrompt ? `\n# Instrucción adicional\n${extraPrompt}` : '',
        '\n# Instrucciones de salida',
        'Para cualquier archivo que generes o modifiques completo, usa:\n```file:ruta/relativa.md\n[contenido]\n```',
      ]
        .filter(Boolean)
        .join('\n\n'),
    },
  ];

  const output = await provider.complete(messages, {
    system: agent.prompt,
    model: config.provider.model,
  });

  // Save transcript
  const transcriptPath = resolve(cwd, '.iagentek', '.transcripts', `agent-${role}-${Date.now()}.md`);
  writeFile(transcriptPath, output);
  logger.dim(`Transcripción guardada en ${relative(cwd, transcriptPath)}`);

  // Extract artifacts
  const writtenFiles = extractAndWriteArtifacts(output, cwd);
  if (writtenFiles.length > 0) {
    logger.success(`\n✅ Archivos generados/actualizados:`);
    writtenFiles.forEach((f) => logger.info(`  - ${relative(cwd, f)}`));
  } else {
    logger.dim('\n(el agente no generó archivos — revisa el transcript para ver su respuesta)');
  }
}

function buildAgentContext(cwd: string): string {
  const iagentekDir = resolve(cwd, '.iagentek');
  if (!existsSync(iagentekDir)) return '(no hay .iagentek/ todavía)';

  const sections: string[] = [];
  const filesToInclude = [
    'project-brief.md',
    'constitution.md',
    'PRD.md',
    'architecture.md',
    'sprint-plan.md',
    'DoD.md',
    'current-state.md',
  ];
  for (const f of filesToInclude) {
    const path = resolve(iagentekDir, f);
    if (existsSync(path)) {
      sections.push(`### ${f}\n\`\`\`md\n${readFileSync(path, 'utf-8')}\n\`\`\``);
    }
  }

  // Include all specs, plans, stories, tasks
  for (const subdir of ['specs', 'plans', 'stories', 'tasks']) {
    const dir = resolve(iagentekDir, subdir);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      const path = resolve(dir, entry);
      if (statSync(path).isFile() && entry.endsWith('.md')) {
        sections.push(`### ${subdir}/${entry}\n\`\`\`md\n${readFileSync(path, 'utf-8')}\n\`\`\``);
      }
    }
  }

  return sections.join('\n\n') || '(.iagentek/ está vacío)';
}

function extractAndWriteArtifacts(output: string, projectDir: string): string[] {
  const regex = /```file:([^\n`]+)\n([\s\S]*?)```/g;
  const written: string[] = [];
  let match;
  while ((match = regex.exec(output)) !== null) {
    const relativePath = match[1].trim();
    const content = match[2];
    const absPath = resolve(projectDir, relativePath);
    writeFile(absPath, content);
    written.push(absPath);
  }
  return written;
}

function writeFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf-8');
}

function loadDotEnv(cwd: string): void {
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
    if (!(key in process.env)) process.env[key] = value;
  }
}
