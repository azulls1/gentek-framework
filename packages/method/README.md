# @iagentek/method

**BMAD** agents + **Spec-Driven Development** templates + **flow** definitions for the IAgentek framework. **Bilingual: English (canonical) and Español.**

Ships the assets as pure markdown + a small TypeScript loader. Any runner (CLI, plugin, web) can consume them.

## Included agents (9)

- `analyst` — discovery and problem definition
- `pm` — PRD and per-feature specs
- `architect` — stack, design, per-feature plans
- `scrum-master` — stories, tasks, sprint plan, DoD
- `dev` — implementation with tests
- `qa` — AC validation + reports
- `devops` — CI/CD, infra, deployment runbook
- `debugger` — incident response (reproduce → root cause → fix → postmortem)
- `refactor-architect` — tech-debt audit + staged migration plan

Each agent ships in **two languages**: `packages/method/assets/en/agents/<role>.md` and `packages/method/assets/es/agents/<role>.md`.

## SDD templates (9)

`constitution.md`, `project-brief.md`, `PRD.md`, `spec.md`, `plan.md`, `tasks.md`, `story.md`, `architecture.md`, `current-state.md`.

All available in `/en/` and `/es/`.

## Flows (4)

`greenfield` · `brownfield` · `bugfix` · `refactor`.

Each is a YAML file describing the sequence of phases, agents, inputs, outputs, and checkpoints. Available in both languages with phase names, descriptions, and checkpoint prompts translated.

## API

```ts
import {
  // Types
  type Lang,           // 'en' | 'es'
  type AgentRole,
  type AgentDefinition,
  SUPPORTED_LANGS,     // ['en', 'es']
  DEFAULT_LANG,        // 'en'

  // Helpers
  detectSystemLang,    // returns 'es' if LANG/LC_ALL is es_*, else 'en'

  // Loaders (all accept optional lang, fall back to 'en' if asset missing)
  loadAgent,           // (role, lang?) => AgentDefinition
  loadTemplate,        // (name, lang?) => string
  loadFlow,            // (name, lang?) => string (YAML)
  listAgents,          // (lang?) => string[]
  listTemplates,       // (lang?) => string[]
  listFlows,           // (lang?) => string[]
} from '@iagentek/method';

// Example
const agent = loadAgent('analyst', 'es');
console.log(agent.lang);   // 'es'
console.log(agent.prompt); // markdown of the Spanish version
```

## Fallback

If you request a Spanish asset that doesn't exist (e.g., a new agent added only in `/en/` yet), the loader falls back to English. English is always the canonical source.

## Full docs
[github.com/azulls1/iagentek-framework](https://github.com/azulls1/iagentek-framework)
