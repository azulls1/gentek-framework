# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] — 2026-05-25

### Fixed
- `iagentek --version` now shows the actual package version (it was hardcoded to `0.1.0`).
- The binary reads the version dynamically from `package.json` at runtime so it never drifts again.

### Docs
- Translated all public documentation (README, ARCHITECTURE, CONTRIBUTING, PUBLISHING, SECURITY, CODE_OF_CONDUCT, per-package READMEs, plugin README, GitHub templates) to English.
- Kept the Spanish version as `README.es.md`.

---

## [0.3.0] — 2026-05-25

### Added
- **Bugfix and refactor flows** complete with their specialized agents.
- **Debugger agent** — incident response: reproduction → root cause → fix with test → postmortem.
- **Refactor Architect agent** — debt audit, prioritization by pain×effort, staged migration plan with characterization tests and rollback.
- **Claude Code plugin** (`iagentek-plugin/`) with:
  - 5 slash commands: `/iagentek-init`, `/iagentek-cycle`, `/iagentek-status`, `/iagentek-resume`, `/iagentek-agent`.
  - 9 invocable agents (`@iagentek-analyst` … `@iagentek-refactor-architect`).
- **Packages prepared for npm publication:** READMEs per package, MIT LICENSE, `repository`/`bugs`/`homepage`/`keywords`/`publishConfig` fields in each `package.json`.
- **PUBLISHING.md** — full publish guide with dependency order.
- **CHANGELOG.md** — this file.

### Changed
- `AgentRole` updated in `@iagentek/method` to include `debugger` and `refactor-architect`.
- Main README expanded with sections for the 4 flows, 9 agents, 6 providers, and the Claude Code plugin.

### Renamed
- Project renamed from `gentek` → `iagentek` across the whole codebase (60+ files): npm packages, CLI binary, project folder convention `.iagentek/`, plugin folder, all docs.

---

## [0.2.0] — 2026-05-25

### Added
- **4 new BMAD agents** with full prompts: Scrum Master, Dev, QA, DevOps.
- **Brownfield flow** complete with a builtin `__codebase__` agent that runs `analyzeCodebase()` before the Analyst.
- **Codebase analyzer** (`analyzeCodebase`) in `@iagentek/core/analysis` — detects languages, package managers (node/python/go/rust/ruby/java/php), frameworks (React, Next, Vue, Django, FastAPI, Express, etc.), README.
- **4 new providers:** OpenAI, Gemini, DeepSeek, Ollama.
- **2 new CLI commands:**
  - `iagentek resume` — resumes from the last phase.
  - `iagentek agent <role>` — invokes any agent in isolation with full context.
- **Greenfield now has all 7 phases active** (previously only 3: discovery, definition, design).
- **Template** `current-state.md` for brownfield analysis.

### Changed
- `ConfigManager.defaultConfig` now includes checkpoints for the 4 new phases.
- `Orchestrator` supports builtin agents with the `__name__` prefix.

---

## [0.1.0] — 2026-05-25

### Added
- Initial framework MVP.
- Monorepo with 3 packages: `@iagentek/cli`, `@iagentek/core`, `@iagentek/method`.
- CLI commands: `init`, `cycle`, `status`.
- Anthropic and Claude CLI providers with auto-detection.
- 3 BMAD agents (Analyst, PM, Architect) with full prompts; other 4 as stubs.
- Greenfield flow with 3 active phases.
- Interactive checkpoint system with 3 modes (required/auto/skip).
- State manager (`state.json`) and config manager (`config.yaml`).
- SDD templates: constitution, project-brief, PRD, spec, plan, tasks, story, architecture.
- README + ARCHITECTURE.md.
