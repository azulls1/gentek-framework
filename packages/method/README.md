# @gentek/method

Agentes **BMAD** + plantillas **Spec-Driven Development** + definiciones de **flows** para el framework Gentek.

Distribuye los assets como markdown puro + un pequeño loader TypeScript. Cualquier runner (CLI, plugin, web) puede consumirlos.

## Agentes incluidos
- `analyst` — discovery y problema
- `pm` — PRD y specs
- `architect` — stack y diseño
- `scrum-master` — stories y tasks
- `dev` — implementación
- `qa` — validación
- `devops` — CI/CD
- `debugger` — incidentes y bugs
- `refactor-architect` — deuda técnica

## Plantillas SDD
`constitution.md`, `project-brief.md`, `PRD.md`, `spec.md`, `plan.md`, `tasks.md`, `story.md`, `architecture.md`, `current-state.md`.

## Flows
`greenfield`, `brownfield`, `bugfix`, `refactor`.

## API
```ts
import {
  loadAgent,
  loadTemplate,
  loadFlow,
  listAgents,
  AGENTS_DIR,
  TEMPLATES_DIR,
  FLOWS_DIR,
} from '@gentek/method';
```

## Docs completas
[github.com/azulls1/gentek-framework](https://github.com/azulls1/gentek-framework)
