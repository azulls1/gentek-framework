# @iagentek/cli

`npx`-executable CLI for the **IAgentek** framework (Spec-Driven Development + BMAD Method).

```bash
npx @iagentek/cli init my-product
cd my-product
npx @iagentek/cli cycle --idea "what you want to build"
```

## Commands

| Command | Description |
|---|---|
| `init [name]` | Bootstrap `.iagentek/` with config + state |
| `cycle` | Run the full flow with checkpoints |
| `status` | Phase state, checkpoints, next steps |
| `resume` | Resume from the last paused phase |
| `agent <role>` | Invoke a BMAD agent in isolation |

## Supported providers (auto-detected)
- `claude-cli` (reuses Claude Code auth)
- `anthropic` (`ANTHROPIC_API_KEY`)
- `openai` (`OPENAI_API_KEY`)
- `gemini` (`GEMINI_API_KEY`)
- `deepseek` (`DEEPSEEK_API_KEY`)
- `ollama` (local on `:11434`)

## Flows
- `greenfield` — product from scratch (7 phases)
- `brownfield` — on existing codebase (8 phases, includes preliminary analysis)
- `bugfix` — short incident response
- `refactor` — staged tech-debt reduction

## Full docs
[github.com/azulls1/iagentek-framework](https://github.com/azulls1/iagentek-framework)
