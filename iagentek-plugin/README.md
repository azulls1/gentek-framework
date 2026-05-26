# IAgentek — Claude Code Plugin

Claude Code plugin that exposes the **IAgentek** method (Spec-Driven Development + BMAD) as **slash commands** and native **agents**, complementing the `@iagentek/cli`.

## What's included

### 5 slash commands
- `/iagentek-init` — Bootstrap (greenfield / brownfield / bugfix / refactor)
- `/iagentek-cycle` — Run the cycle with checkpoints
- `/iagentek-status` — Project status
- `/iagentek-resume` — Resume from the last checkpoint
- `/iagentek-agent` — Invoke a BMAD agent in isolation

### 9 invocable agents (`@iagentek-*`)

| Agent | Role |
|---|---|
| `iagentek-analyst` | Discovery and problem definition |
| `iagentek-pm` | PRD + specs |
| `iagentek-architect` | Stack, technical design, per-feature plans |
| `iagentek-scrum-master` | Stories + atomic tasks + DoD |
| `iagentek-dev` | Implementation with tests |
| `iagentek-qa` | AC validation + reports |
| `iagentek-devops` | CI/CD + infra + runbook |
| `iagentek-debugger` | Bug reproduction + root cause + postmortem |
| `iagentek-refactor-architect` | Debt audit + migration plan |

## Install in Claude Code (v2+)

The repo is a **marketplace** that lists this plugin. Add it with the full HTTPS URL (Claude Code defaults to SSH and will fail without keys configured):

```
/plugin marketplace add https://github.com/azulls1/iagentek-framework.git
/plugin install iagentek@iagentek-framework
/reload-plugins
```

After `/reload-plugins`, the slash commands appear in `/help` and the agents are invocable as `@iagentek-analyst`, `@iagentek-pm`, etc.

## Prerequisite

The slash commands invoke `npx @iagentek/cli` under the hood, so you need **Node 18+** in your PATH. The agents themselves work without the CLI (they use Claude Code's native Read/Write/Edit/Bash tools).

## How the two tracks work

| Aspect | Slash commands | Invocable agents |
|---|---|---|
| Execution | Run the full CLI (orchestrator + providers + checkpoints + state) | Run inside Claude Code with native tools |
| Best for | End-to-end reproducible cycles | One-off consultation with a specific role |
| File writing | Via the CLI's `file:path` parser | Via Claude Code's Write/Edit |
| Provider | What `.iagentek/config.yaml` says | The Claude Code session's model |

Both tracks share the **same BMAD prompts** (from `@iagentek/method`).

## Bilingual

Both the CLI (when invoked by slash commands) and the inline agents respect the project's `language` setting (`en` or `es`) from `.iagentek/config.yaml`. The default English version applies if no project config exists yet.

## More info

- Full framework + docs: [github.com/azulls1/iagentek-framework](https://github.com/azulls1/iagentek-framework)
- npm packages: [`@iagentek/cli`](https://www.npmjs.com/package/@iagentek/cli) · [`@iagentek/core`](https://www.npmjs.com/package/@iagentek/core) · [`@iagentek/method`](https://www.npmjs.com/package/@iagentek/method)
