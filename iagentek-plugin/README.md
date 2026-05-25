# IAgentek — Claude Code Plugin

Claude Code plugin that exposes the **IAgentek** method (Spec-Driven Development + BMAD) as **slash commands** and native **agents**, complementing the `@iagentek/cli`.

## What's included

### Slash commands
- `/iagentek-init` — Bootstrap (greenfield/brownfield/bugfix/refactor)
- `/iagentek-cycle` — Run the cycle with checkpoints
- `/iagentek-status` — Project status
- `/iagentek-resume` — Resume from the last checkpoint
- `/iagentek-agent` — Invoke a BMAD agent in isolation

### Invocable agents (`@iagentek-*`)
| Agent | Role |
|---|---|
| `iagentek-analyst` | Discovery and problem definition |
| `iagentek-pm` | PRD + specs |
| `iagentek-architect` | Stack, technical design, per-feature plans |
| `iagentek-scrum-master` | Stories + atomic tasks + DoD |
| `iagentek-dev` | Implementation with tests |
| `iagentek-qa` | AC validation + reports |
| `iagentek-devops` | CI/CD + infra + runbook |
| `iagentek-debugger` | Bug + root cause + postmortem |
| `iagentek-refactor-architect` | Debt audit + migration plan |

## Install in Claude Code

```bash
# From Claude Code, add this plugin pointing to the repo and subpath:
/plugin add github.com/azulls1/iagentek-framework path:iagentek-plugin
```

(Exact syntax may vary depending on your Claude Code version — check `/plugin --help`.)

## Prerequisite
The slash commands invoke `npx @iagentek/cli` under the hood, so you need Node 18+ in your PATH. The agents work independently (they use Claude Code's native tools).

## How the two tracks work
- **Slash commands** = run the full CLI (with orchestrator, providers, checkpoints, state). Use these when you want to run the cycle end-to-end.
- **Agents** = run inside Claude Code using native Read/Write/Edit, without going through the CLI. Use these when you want to consult a specific role for a one-off task.

## More info
- Full framework: [github.com/azulls1/iagentek-framework](https://github.com/azulls1/iagentek-framework)
