import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { loadAgent, type AgentRole } from '@gentek/method';
import type { AIProvider, ChatMessage } from '../providers/types.js';
import type { GentekConfig } from '../config/loader.js';
import type { PhaseDefinition, FlowDefinition } from '../flow/loader.js';
import { StateManager } from '../state/manager.js';
import { CheckpointManager, type CheckpointHandler } from '../checkpoints/manager.js';
import { analyzeCodebase, summarizeAnalysis } from '../analysis/codebase.js';
import { logger } from '../util/logger.js';

export interface OrchestratorOptions {
  projectDir: string;
  config: GentekConfig;
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
        logger.dim(`  ⤴  Skip fase '${phase.name}' (ya completada)`);
        continue;
      }

      logger.header(`\n🛠  Fase: ${phase.name}  (agente: ${phase.agent})`);
      this.state.setCurrentPhase(phase.id);

      const output = await this.runPhase(phase);
      this.opts.onAgentOutput?.(phase.id, output);

      // Write the agent's full transcript for traceability
      const transcriptPath = resolve(
        this.opts.projectDir,
        '.gentek',
        '.transcripts',
        `${phase.id}.md`
      );
      writeFile(transcriptPath, output);

      // Extract and write any structured outputs the agent produced
      const writtenFiles = extractAndWriteArtifacts(output, this.opts.projectDir);
      if (writtenFiles.length > 0) {
        logger.dim(`  📝 Artefactos generados:`);
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
          logger.warn(`\n⏸  Ciclo pausado en '${phase.name}'. Decisión: ${decision}.`);
          logger.info(`Retoma con: npx @gentek/cli resume`);
          return;
        }
      }

      this.state.markPhaseCompleted(phase.id);
    }

    logger.success('\n✅ Ciclo completo. Todas las fases habilitadas terminaron.');
  }

  private async runPhase(phase: PhaseDefinition): Promise<string> {
    if (phase.agent.startsWith('__') && phase.agent.endsWith('__')) {
      return this.runBuiltinAgent(phase);
    }

    const agent = loadAgent(phase.agent as AgentRole);

    const contextSections = buildPhaseContext(
      phase,
      this.opts.projectDir,
      this.opts.userIdea,
      this.opts.config.projectName
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
        logger.dim('  🔍 Analizando codebase...');
        const analysis = analyzeCodebase(this.opts.projectDir);
        const summary = summarizeAnalysis(analysis);
        return [
          summary,
          '',
          '```file:.gentek/current-state.md',
          summary,
          '```',
        ].join('\n');
      }
      default:
        throw new Error(`Builtin agent desconocido: ${phase.agent}`);
    }
  }

  private summarize(phase: PhaseDefinition, writtenFiles: string[]): string {
    return [
      `Fase: ${phase.name}`,
      `Agente: ${phase.agent}`,
      `Archivos generados: ${writtenFiles.length}`,
      ...writtenFiles.map((f) => `  - ${relative(this.opts.projectDir, f)}`),
    ].join('\n');
  }
}

function buildPhaseContext(
  phase: PhaseDefinition,
  projectDir: string,
  userIdea: string | undefined,
  projectName: string
): string {
  const sections: string[] = [];
  sections.push(`# Contexto de la fase: ${phase.name}`);
  sections.push(`**Proyecto:** ${projectName}`);
  if (userIdea) {
    sections.push(`**Idea inicial del humano:**\n${userIdea}`);
  }

  if (phase.inputs && phase.inputs.length > 0) {
    sections.push('## Archivos de input existentes');
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

  sections.push('## Instrucciones');
  sections.push(
    `Sigue tu rol y produce los outputs esperados. Para CADA archivo que generes, usa el formato exacto:\n\n` +
      `\`\`\`file:RUTA/RELATIVA/AL/PROYECTO.md\n[contenido completo del archivo]\n\`\`\`\n\n` +
      `Ejemplo:\n\`\`\`file:.gentek/project-brief.md\n# Project Brief: ...\n\`\`\`\n\n` +
      `Después de los archivos, escribe un resumen breve de las decisiones clave (máx 5 bullets).`
  );

  return sections.join('\n\n');
}

/**
 * Parses agent output for ```file:path\ncontent``` blocks and writes them to disk.
 * Returns the absolute paths of files written.
 */
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
