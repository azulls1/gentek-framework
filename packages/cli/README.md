# @iagentek/cli

`npx`-executable CLI for the **IAgentek** framework (Spec-Driven Development + BMAD Method). **Bilingual output: English / Español.**

```bash
npx @iagentek/cli init my-product
cd my-product
npx @iagentek/cli cycle --idea "what you want to build"
```

You pick the output language at `init` — English (default) or Spanish — and every artifact (brief, PRD, specs, architecture, code, tests, runbook) is generated in that language.

## Commands

| Command | Description |
|---|---|
| `init [name] [--lang en\|es] [--flow greenfield\|brownfield\|bugfix\|refactor] [--provider <id>]` | Bootstrap `.iagentek/` with config + state |
| `cycle [--flow X] [--idea "..."] [--lang en\|es]` | Run the full flow with checkpoints |
| `status` | Phase state, checkpoints, next steps, configured language |
| `resume` | Resume from the last paused phase |
| `agent <role> [--prompt "..."]` | Invoke a BMAD agent (analyst, pm, architect, scrum-master, dev, qa, devops, debugger, refactor-architect) in isolation |

## Supported providers (auto-detected)
- `claude-cli` (reuses Claude Code Max/Pro auth — $0 extra)
- `anthropic` (`ANTHROPIC_API_KEY`)
- `openai` (`OPENAI_API_KEY`)
- `gemini` (`GEMINI_API_KEY`)
- `deepseek` (`DEEPSEEK_API_KEY`)
- `ollama` (local on `:11434`)

## Flows
- `greenfield` — product from scratch (7 phases)
- `brownfield` — on existing codebase (8 phases, with automatic code analysis)
- `bugfix` — incident response (triage → repro → root cause → fix with red regression test → postmortem)
- `refactor` — staged tech-debt reduction (audit → migration plan → safe execution)

## Bilingual
```bash
# Interactive — choose at init
npx @iagentek/cli init my-app

# Or explicit
npx @iagentek/cli init my-app --lang es      # Spanish output
npx @iagentek/cli init my-app --lang en      # English output (default)

# Override per cycle
npx @iagentek/cli cycle --lang es
```
Auto-detects system locale (`LANG`/`LC_ALL`) and proposes Spanish for `es_*` systems.

## Full docs
[github.com/azulls1/iagentek-framework](https://github.com/azulls1/iagentek-framework)
