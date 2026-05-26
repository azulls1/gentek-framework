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
    logger.error('No .iagentek/config.yaml found. Run first: npx @iagentek/cli init');
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
      message: 'Which agent do you want to invoke?',
      choices: available.map((a) => ({ title: a, value: a })),
    });
    role = selected;
  }
  if (!role || !available.includes(role)) {
    logger.error(`Unknown agent: ${role}. Available: ${available.join(', ')}`);
    return;
  }

  const agent = loadAgent(role as AgentRole, config.language ?? 'en');
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
      message: 'Extra instruction for the agent? (ENTER to use only the project context)',
    });
    extraPrompt = p;
  }

  logger.header(`\n🧠 Invoking agent '${role}' with provider ${config.provider.id}\n`);

  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: [
        '# Project context',
        context,
        extraPrompt ? `\n# Additional instruction\n${extraPrompt}` : '',
        '\n# Output instructions',
        'For any file you generate or fully modify, use:\n```file:relative/path.md\n[content]\n```',
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
  logger.dim(`Transcript saved at ${relative(cwd, transcriptPath)}`);

  // Extract artifacts
  const writtenFiles = extractAndWriteArtifacts(output, cwd);
  if (writtenFiles.length > 0) {
    logger.success(`\n✅ Files generated/updated:`);
    writtenFiles.forEach((f) => logger.info(`  - ${relative(cwd, f)}`));
  } else {
    logger.dim('\n(the agent generated no files — check the transcript for its response)');
  }
}

function buildAgentContext(cwd: string): string {
  const iagentekDir = resolve(cwd, '.iagentek');
  if (!existsSync(iagentekDir)) return '(no .iagentek/ yet)';

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

  return sections.join('\n\n') || '(.iagentek/ is empty)';
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
