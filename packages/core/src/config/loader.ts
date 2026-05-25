import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import yaml from 'js-yaml';
import type { ProviderId } from '../providers/types.js';

export interface GentekConfig {
  version: string;
  projectName: string;
  provider: {
    id: ProviderId;
    model?: string;
    apiKeyEnv?: string;
  };
  flow: string;
  mode: 'autonomous-with-checkpoints' | 'fully-autonomous' | 'interactive';
  checkpoints: {
    [phaseId: string]: 'required' | 'auto' | 'skip';
  };
}

export class ConfigManager {
  private path: string;

  constructor(projectDir: string) {
    this.path = resolve(projectDir, '.gentek', 'config.yaml');
  }

  exists(): boolean {
    return existsSync(this.path);
  }

  load(): GentekConfig {
    if (!this.exists()) {
      throw new Error(`No hay config.yaml en ${this.path}. ¿Corriste 'gentek init'?`);
    }
    return yaml.load(readFileSync(this.path, 'utf-8')) as GentekConfig;
  }

  save(config: GentekConfig): void {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, yaml.dump(config, { lineWidth: 100 }), 'utf-8');
  }

  defaultConfig(projectName: string, providerId: ProviderId, flow = 'greenfield'): GentekConfig {
    return {
      version: '0.1.0',
      projectName,
      provider: {
        id: providerId,
        model: defaultModelFor(providerId),
        apiKeyEnv: envVarFor(providerId),
      },
      flow,
      mode: 'autonomous-with-checkpoints',
      checkpoints: {
        'discovery-approved': 'required',
        'specs-approved': 'required',
        'architecture-approved': 'required',
        'planning-approved': 'required',
        'story-done': 'required',
        'qa-approved': 'required',
        'release-approved': 'required',
      },
    };
  }
}

function defaultModelFor(id: ProviderId): string {
  switch (id) {
    case 'claude-cli':
    case 'anthropic':
      return 'claude-opus-4-7';
    case 'openai':
      return 'gpt-4o';
    case 'gemini':
      return 'gemini-2.0-flash';
    case 'deepseek':
      return 'deepseek-chat';
    case 'ollama':
      return 'llama3.1';
  }
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
    case 'claude-cli':
    case 'ollama':
      return undefined;
  }
}
