# @gentek/core

Núcleo del framework **Gentek**: providers de IA, orchestrator de fases, sistema de checkpoints, state manager y analizador de codebase.

Si solo quieres usar Gentek desde la CLI, instala [`@gentek/cli`](https://www.npmjs.com/package/@gentek/cli). Este paquete es para integradores que quieren construir runners personalizados (CI, web UI, otro CLI, etc.).

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
} from '@gentek/core';
```

## Providers soportados
`anthropic`, `claude-cli`, `openai`, `gemini`, `deepseek`, `ollama`.

## Docs completas
[github.com/azulls1/gentek-framework](https://github.com/azulls1/gentek-framework)
