# IAgentek

[![npm version](https://img.shields.io/npm/v/@iagentek/cli.svg?label=npm&color=cb3837)](https://www.npmjs.com/package/@iagentek/cli)
[![CI](https://img.shields.io/github/actions/workflow/status/azulls1/iagentek-framework/ci.yml?branch=main&label=CI)](https://github.com/azulls1/iagentek-framework/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/node/v/@iagentek/cli.svg)](https://nodejs.org)
[![npm downloads](https://img.shields.io/npm/dm/@iagentek/cli.svg)](https://www.npmjs.com/package/@iagentek/cli)

> Autonomous AI-assisted development framework for engineering teams.
> Merges **Spec-Driven Development** (specs as source of truth) with the **BMAD Method** (specialized agents with clear roles).

One command, one full cycle. Greenfield, brownfield, bugfix, or refactor. Claude by default, any AI via API key. Available as **`npx` CLI** or as a **Claude Code plugin**.

> 🇪🇸 También disponible en [español](./README.es.md)

```bash
npx @iagentek/cli init my-product
cd my-product
npx @iagentek/cli cycle --idea "I want a ticketing system for support that..."
```

Or from Claude Code:
```
/iagentek-init my-product
/iagentek-cycle --idea "..."
```

---

## What it does

IAgentek orchestrates a virtual team of agents (Analyst → PM → Architect → Scrum Master → Dev → QA → DevOps + Debugger + Refactor Architect) that walk through a complete development cycle. Each agent produces **spec-driven** artifacts (constitution, PRD, specs, plans, tasks, stories) that become the project's source of truth. You approve at key checkpoints and the cycle continues.

**Execution modes:**
- `autonomous-with-checkpoints` (default) — runs on its own, stops at critical moments
- `fully-autonomous` — end-to-end without stopping
- `interactive` — asks at every step

**4 complete cycles:**
- `greenfield` — product from scratch (7 phases)
- `brownfield` — on existing codebase (8 phases, automatic preliminary analysis)
- `bugfix` — short incident response (triage → repro → fix → postmortem)
- `refactor` — staged tech-debt reduction (audit → migration plan → safe execution)

**6 AI providers (auto-detected):**
| Provider | How it's detected | Default model |
|---|---|---|
| `claude-cli` | `claude` command in PATH | claude-opus-4-7 |
| `anthropic` | `ANTHROPIC_API_KEY` | claude-opus-4-7 |
| `openai` | `OPENAI_API_KEY` | gpt-4o |
| `gemini` | `GEMINI_API_KEY` | gemini-2.0-flash |
| `deepseek` | `DEEPSEEK_API_KEY` | deepseek-chat |
| `ollama` | `ollama` command in PATH | llama3.1 |

**9 BMAD agents:**
Analyst · PM · Architect · Scrum Master · Dev · QA · DevOps · Debugger · Refactor Architect.

---

## Quick start (CLI)

### 1) Bootstrap
```bash
npx @iagentek/cli init my-product
```
Automatically detects the available provider. If you need an API key and it isn't in env, it asks for it and stores it in `.env` (with automatic `.gitignore`).

### 2) Run the cycle
```bash
cd my-product
npx @iagentek/cli cycle --idea "Mobile app to book paddle tennis courts"
```

### 3) Available commands
| Command | What it does |
|---|---|
| `init [name]` | Bootstrap `.iagentek/` with config + state |
| `cycle [--flow X] [--idea "..."]` | Run the cycle with checkpoints |
| `status` | Show phases, approved checkpoints, next steps |
| `resume` | Resume from the last paused phase |
| `agent <role> [--prompt "..."]` | Invoke a BMAD agent in isolation |

---

## Quick start (Claude Code plugin)

Install the plugin pointing at this repo:
```
/plugin add github.com/azulls1/iagentek-framework path:iagentek-plugin
```

Commands available after install:
- `/iagentek-init` — interactive bootstrap
- `/iagentek-cycle` — full cycle
- `/iagentek-status` — current state
- `/iagentek-resume` — resume from checkpoint
- `/iagentek-agent` — invoke an agent

Agents invocable as `@iagentek-analyst`, `@iagentek-pm`, `@iagentek-architect`, etc.

See details in [`iagentek-plugin/README.md`](./iagentek-plugin/README.md).

---

## What gets generated in your project

```
my-product/
├── .env                       # API key (gitignored)
├── .gitignore
└── .iagentek/
    ├── config.yaml            # provider, flow, mode, checkpoints
    ├── state.json             # phase tracking (gitignored)
    ├── constitution.md        # non-negotiable principles (SDD)
    ├── project-brief.md       # Analyst output
    ├── current-state.md       # only in brownfield/bugfix/refactor (auto)
    ├── PRD.md                 # PM output
    ├── architecture.md        # Architect output
    ├── sprint-plan.md         # Scrum Master output
    ├── DoD.md                 # Definition of Done
    ├── specs/                 # SDD specs per feature
    ├── plans/                 # technical plans per feature
    ├── stories/               # user stories (sprint)
    ├── tasks/                 # atomic tasks (1-4h)
    ├── qa/                    # QA reports per story
    ├── deployment.md          # DevOps runbook
    ├── incidents/             # postmortems (bugfix only)
    ├── debt-audit.md          # audit (refactor only)
    ├── refactor-plans/        # staged plans (refactor only)
    └── .transcripts/          # raw agent outputs (gitignored)
```

---

## SDD + BMAD fusion

| Aspect | What SDD brings | What BMAD brings |
|---|---|---|
| Artifacts | Constitution, spec, plan, tasks | — |
| Agents | — | Analyst, PM, Architect, SM, Dev, QA, DevOps |
| Philosophy | Specs are the contract | Specialized roles execute |
| Validation | Verifiable acceptance criteria | Human checkpoints per phase |

**In IAgentek:** the BMAD agents are the executors; the SDD artifacts are the contract. Each agent reads prior artifacts as input and produces its own as output. The human approves at checkpoints.

---

## Framework architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md). Monorepo with 3 npm packages + 1 Claude Code plugin:

- `@iagentek/cli` — `npx`-executable CLI
- `@iagentek/core` — AI providers, orchestrator, checkpoints, state, codebase analyzer
- `@iagentek/method` — BMAD agents + SDD templates + flows (markdown + YAML)
- `iagentek-plugin/` — complementary Claude Code plugin (not published to npm)

---

## Quick smoke test (verify end-to-end in ~30 min)

Want to confirm the framework actually produces working code on your machine? Run this:

```bash
# 1. Bootstrap a sandbox project
mkdir -p /tmp/iagentek-smoke && cd /tmp/iagentek-smoke
npx @iagentek/cli init demo --provider claude-cli

# 2. Use fully-autonomous mode so it runs all 7 phases without prompts
cd demo
cat > .iagentek/config.yaml <<EOF
version: 0.1.0
projectName: demo
provider:
  id: claude-cli
  model: claude-opus-4-7
flow: greenfield
mode: fully-autonomous
checkpoints:
  discovery-approved: auto
  specs-approved: auto
  architecture-approved: auto
  planning-approved: auto
  story-done: auto
  qa-approved: auto
  release-approved: auto
EOF

# 3. Run the full cycle with a simple, well-scoped idea
npx @iagentek/cli cycle --idea "A Python CLI 'urlsnap' that downloads HTML from a URL and saves it with a timestamped filename. Handle 404/500/timeout errors. Flag --output for destination folder."
```

The cycle takes ~25-45 min (Claude does the heavy lifting). When it finishes you'll have:
- Spec-driven artifacts (`.iagentek/project-brief.md`, `PRD.md`, `architecture.md`, specs, plans, stories, tasks)
- Real Python code in `src/urlsnap/*.py` (cli, downloader, naming, writer, errors, ...)
- pytest test suite in `tests/`
- CI workflows in `.github/workflows/`
- Project scaffold (`pyproject.toml`, `README.md`, `.env.example`)

Then verify the generated product actually works:

```bash
PYTHONPATH=src python -m urlsnap https://example.com -o /tmp/snaps
ls /tmp/snaps/   # → example.com_2026-05-26T143022.html (real HTML downloaded)
```

**Requirements:** Claude Code CLI installed and authenticated (`claude` in PATH) — or any other supported provider with an API key in env.

---

## Local development

```bash
git clone https://github.com/azulls1/iagentek-framework
cd iagentek-framework
npm install
npm run build
node packages/cli/dist/bin/iagentek.js --help
```

## Publishing to npm
See [PUBLISHING.md](./PUBLISHING.md).

---

## Status and roadmap

**v0.3.1 (current):**
- ✅ Bug fix: `iagentek --version` shows the real package version
- ✅ Version is now read dynamically from `package.json` at runtime
- ✅ 61 tests still pass

**v0.3.0:**
- ✅ 4 complete cycles (greenfield, brownfield, bugfix, refactor)
- ✅ 9 BMAD agents with full prompts
- ✅ 6 AI providers with auto-detection
- ✅ Claude Code plugin (5 slash commands + 9 agents)
- ✅ Packages ready for npm publication
- ✅ Automatic codebase analyzer for brownfield

**Possible future improvements (not committed):**
- Real-time token streaming
- Web UI to visualize the cycle
- Support for more providers (Mistral, Groq, Cohere)
- Real per-story loop in the implementation phase
- Response cache to reduce AI costs

---

## Contributing
Pull requests welcome. Issues at [github.com/azulls1/iagentek-framework/issues](https://github.com/azulls1/iagentek-framework/issues).

## License
MIT — see [LICENSE](./LICENSE).
