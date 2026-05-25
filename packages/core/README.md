# @iagentek/core

Núcleo del framework **IAgentek**: providers de IA, orchestrator de fases, sistema de checkpoints, state manager y analizador de codebase.

Si solo quieres usar IAgentek desde la CLI, instala [`@iagentek/cli`](https://www.npmjs.com/package/@iagentek/cli). Este paquete es para integradores que quieren construir runners personalizados (CI, web UI, otro CLI, etc.).

## Exports principales
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

## Providers soportados
`anthropic`, `claude-cli`, `openai`, `gemini`, `deepseek`, `ollama`.

## Docs completas
[github.com/azulls1/iagentek-framework](https://github.com/azulls1/iagentek-framework)
