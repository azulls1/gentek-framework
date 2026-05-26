import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { loadAgent, type AgentRole, type Lang } from '@iagentek/method';
import type { AIProvider, ChatMessage } from '../providers/types.js';
import type { IAgentekConfig } from '../config/loader.js';
import type { PhaseDefinition, FlowDefinition } from '../flow/loader.js';
import { StateManager } from '../state/manager.js';
import { CheckpointManager, type CheckpointHandler } from '../checkpoints/manager.js';
import { analyzeCodebase, summarizeAnalysis } from '../analysis/codebase.js';
import { logger } from '../util/logger.js';

export interface OrchestratorOptions {
  projectDir: string;
  config: IAgentekConfig;
  flow: FlowDefinition;
  provider: AIProvider;
  checkpointHandler: CheckpointHandler;
  userIdea?: string;
  onAgentOutput?: (phaseId: string, output: string) => void;
}

export class Orchestrator {
  private state: StateManager;
  private checkpoints: CheckpointManager;

  constructor(private opts: OrchestratorOptions) {
    this.state = new StateManager(opts.projectDir);
    this.checkpoints = new CheckpointManager(opts.config, this.state, opts.checkpointHandler);
  }

  async run(): Promise<void> {
    const state = this.state.exists()
      ? this.state.load()
      : this.state.init(this.opts.config.projectName, this.opts.flow.name);

    const phases = this.opts.flow.phases.filter((p) => p.enabled !== false);

    for (const phase of phases) {
      if (state.completedPhases.includes(phase.id)) {
        logger.dim(`  ⤴  Skip phase '${phase.name}' (already completed)`);
        continue;
      }

      logger.header(`\n🛠  Phase: ${phase.name}  (agent: ${phase.agent})`);
      this.state.setCurrentPhase(phase.id);

      const output = await this.runPhase(phase);
      this.opts.onAgentOutput?.(phase.id, output);

      // Write the agent's full transcript for traceability
      const transcriptPath = resolve(
        this.opts.projectDir,
        '.iagentek',
        '.transcripts',
        `${phase.id}.md`
      );
      writeFile(transcriptPath, output);

      // Extract and write any structured outputs the agent produced
      const writtenFiles = extractAndWriteArtifacts(output, this.opts.projectDir);
      if (writtenFiles.length > 0) {
        logger.dim(`  📝 Artifacts generated:`);
        writtenFiles.forEach((f) =>
          logger.dim(`     - ${relative(this.opts.projectDir, f)}`)
        );
      }

      // Run checkpoint if defined
      if (phase.checkpoint) {
        const summary = this.summarize(phase, writtenFiles);
        const decision = await this.checkpoints.run(
          phase.checkpoint.id,
          phase.id,
          phase.checkpoint.prompt,
          summary,
          writtenFiles
        );
        if (decision !== 'approve') {
          logger.warn(`\n⏸  Cycle paused at '${phase.name}'. Decision: ${decision}.`);
          logger.info(`Resume with: npx @iagentek/cli resume`);
          return;
        }
      }

      this.state.markPhaseCompleted(phase.id);
    }

    logger.success('\n✅ Cycle complete. All enabled phases finished.');
  }

  private async runPhase(phase: PhaseDefinition): Promise<string> {
    if (phase.agent.startsWith('__') && phase.agent.endsWith('__')) {
      return this.runBuiltinAgent(phase);
    }

    const lang = this.opts.config.language ?? 'en';
    const agent = loadAgent(phase.agent as AgentRole, lang);

    const contextSections = buildPhaseContext(
      phase,
      this.opts.projectDir,
      this.opts.userIdea,
      this.opts.config.projectName,
      lang
    );

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: contextSections,
      },
    ];

    const output = await this.opts.provider.complete(messages, {
      system: agent.prompt,
      model: this.opts.config.provider.model,
    });

    return output;
  }

  private async runBuiltinAgent(phase: PhaseDefinition): Promise<string> {
    switch (phase.agent) {
      case '__codebase__': {
        logger.dim('  🔍 Analyzing codebase...');
        const analysis = analyzeCodebase(this.opts.projectDir);
        const summary = summarizeAnalysis(analysis);
        return [
          summary,
          '',
          '```file:.iagentek/current-state.md',
          summary,
          '```',
        ].join('\n');
      }
      default:
        throw new Error(`Unknown builtin agent: ${phase.agent}`);
    }
  }

  private summarize(phase: PhaseDefinition, writtenFiles: string[]): string {
    return [
      `Phase: ${phase.name}`,
      `Agent: ${phase.agent}`,
      `Generated files: ${writtenFiles.length}`,
      ...writtenFiles.map((f) => `  - ${relative(this.opts.projectDir, f)}`),
    ].join('\n');
  }
}

function buildPhaseContext(
  phase: PhaseDefinition,
  projectDir: string,
  userIdea: string | undefined,
  projectName: string,
  lang: Lang
): string {
  const sections: string[] = [];
  sections.push(`# Phase context: ${phase.name}`);
  sections.push(`**Project:** ${projectName}`);
  sections.push(`**Output language:** ${lang === 'es' ? 'Spanish (español)' : 'English'}`);
  if (userIdea) {
    sections.push(`**Initial idea from human:**\n${userIdea}`);
  }

  if (phase.inputs && phase.inputs.length > 0) {
    sections.push('## Existing input files');
    for (const input of phase.inputs) {
      // Skip wildcards and user.* references in MVP
      if (input.includes('*') || input.startsWith('user.')) continue;
      const path = resolve(projectDir, input);
      if (existsSync(path)) {
        const content = readFileSync(path, 'utf-8');
        sections.push(`### ${input}\n\`\`\`md\n${content}\n\`\`\``);
      }
    }
  }

  const langInstr = lang === 'es'
    ? 'Write all generated artifacts in Spanish (español).'
    : 'Write all generated artifacts in English.';

  sections.push('## Instructions');
  sections.push(
    `Follow your role and produce the expected outputs. For EACH file you generate, use the exact format:\n\n` +
      `\`\`\`file:PATH/RELATIVE/TO/PROJECT.md\n[COMPLETE file content — real code, no placeholders, no summary comments]\n\`\`\`\n\n` +
      `Example:\n\`\`\`file:.iagentek/project-brief.md\n# Project Brief: ...\n\`\`\`\n\n` +
      `CRITICAL RULE: DO NOT use native filesystem tools (Write, Edit, Bash) to write project files. ` +
      `All content must go IN your output as file:path blocks with complete code. ` +
      `If you only write a placeholder comment inside the block, the orchestrator will write THAT placeholder to disk — losing any real work you did with tools.\n\n` +
      `LANGUAGE: ${langInstr}\n\n` +
      `After the files, write a brief summary of the key decisions (max 5 bullets).`
  );

  return sections.join('\n\n');
}

/**
 * Heuristic: returns true if the content looks like a placeholder/comment
 * rather than real implementation. Used to avoid overwriting real files
 * when an agent (e.g. Dev with native tools) wrote substantive content
 * directly to disk and then reported only a short placeholder in its message.
 */
function looksLikePlaceholder(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length === 0) return false; // empty is intentional (e.g. __init__.py)
  if (trimmed.length >= 200) return false;
  // Single comment line (#, //, /*, --, ;, "")
  const lines = trimmed.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length <= 2) {
    const allComments = lines.every((l) => /^\s*(#|\/\/|\/\*|--|;|""")/.test(l));
    if (allComments) return true;
  }
  // Contains placeholder-indicating phrases
  const lowered = trimmed.toLowerCase();
  if (/full file already (written|exists)|see above|already in disk/.test(lowered)) {
    return true;
  }
  return false;
}

/**
 * Parses agent output for ```file:path\ncontent``` blocks and writes them to disk.
 * Returns the absolute paths of files written.
 *
 * Safeguard: if the new content looks like a placeholder and the destination
 * file already exists with substantively more content, skip the write. This
 * prevents an agent's "summary placeholder" from clobbering real code the
 * agent wrote earlier with native filesystem tools.
 */
function extractAndWriteArtifacts(output: string, projectDir: string): string[] {
  const regex = /```file:([^\n`]+)\n([\s\S]*?)```/g;
  const written: string[] = [];
  let match;
  while ((match = regex.exec(output)) !== null) {
    const relativePath = match[1].trim();
    const content = match[2];
    const absPath = resolve(projectDir, relativePath);

    if (looksLikePlaceholder(content) && existsSync(absPath)) {
      const existing = readFileSync(absPath, 'utf-8');
      if (existing.length > content.length + 100) {
        // Existing file is meaningfully larger and the new content is a placeholder.
        // Keep the existing file and still count it as "written" for reporting.
        written.push(absPath);
        continue;
      }
    }

    writeFile(absPath, content);
    written.push(absPath);
  }
  return written;
}

function writeFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf-8');
}
