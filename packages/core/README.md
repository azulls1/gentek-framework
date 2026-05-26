# @iagentek/core

Core of the **IAgentek** framework: AI providers, phase orchestrator, checkpoint system, state manager, codebase analyzer, and bilingual (English/Español) asset loading.

If you just want to use IAgentek from the CLI, install [`@iagentek/cli`](https://www.npmjs.com/package/@iagentek/cli). This package is for integrators who want to build custom runners (CI, web UI, another CLI, etc.).

## Main exports
```ts
import {
  // Providers
  createProvider,
  detectProviders,

  // Orchestration
  Orchestrator,
  type CheckpointHandler,

  // Project state
  ConfigManager,
  StateManager,
  CheckpointManager,
  loadFlowDefinition,

  // Brownfield analysis
  analyzeCodebase,
} from '@iagentek/core';

// Bilingual support comes from @iagentek/method:
import { type Lang, detectSystemLang } from '@iagentek/method';
```

## Supported providers
`anthropic`, `claude-cli`, `openai`, `gemini`, `deepseek`, `ollama`.

Each implements the `AIProvider` interface:
```ts
interface AIProvider {
  id: ProviderId;
  displayName: string;
  defaultModel: string;
  complete(messages: ChatMessage[], options?: CompletionOptions): Promise<string>;
}
```

## Bilingual support
`@iagentek/core` propagates the `language: 'en' | 'es'` field from `config.yaml` through every phase. Agents, templates, and flow definitions are loaded from `/en/` or `/es/` (with fallback to English) — handled by `@iagentek/method`.

## Full docs
[github.com/azulls1/iagentek-framework](https://github.com/azulls1/iagentek-framework)
