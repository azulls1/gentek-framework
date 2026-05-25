# @iagentek/method

**BMAD** agents + **Spec-Driven Development** templates + **flow** definitions for the IAgentek framework.

Ships the assets as pure markdown + a small TypeScript loader. Any runner (CLI, plugin, web) can consume them.

## Included agents
- `analyst` — discovery and problem definition
- `pm` — PRD and specs
- `architect` — stack and design
- `scrum-master` — stories and tasks
- `dev` — implementation
- `qa` — validation
- `devops` — CI/CD
- `debugger` — incidents and bugs
- `refactor-architect` — tech-debt

> **Note:** the agent prompts are currently written in Spanish (the project's original language). They produce artifacts in whichever language the user requests. English-localized prompts are on the roadmap.

## SDD templates
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
} from '@iagentek/method';
```

## Full docs
[github.com/azulls1/iagentek-framework](https://github.com/azulls1/iagentek-framework)
