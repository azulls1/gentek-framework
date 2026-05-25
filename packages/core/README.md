# @iagentek/core

Core of the **IAgentek** framework: AI providers, phase orchestrator, checkpoint system, state manager, and codebase analyzer.

If you just want to use IAgentek from the CLI, install [`@iagentek/cli`](https://www.npmjs.com/package/@iagentek/cli). This package is for integrators who want to build custom runners (CI, web UI, another CLI, etc.).

## Main exports
```ts
import {
  createProvider,
  detectProviders,
  Orchestrator,
  ConfigManager,
  StateManager,
  CheckpointManager,
  analyzeCodebase,
  loadFlowDefinition,
} from '@iagentek/core';
```

## Supported providers
`anthropic`, `claude-cli`, `openai`, `gemini`, `deepseek`, `ollama`.

## Full docs
[github.com/azulls1/iagentek-framework](https://github.com/azulls1/iagentek-framework)
