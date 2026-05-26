# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.3] — 2026-05-26

### Fixed
- **Architectural bug: orchestrator was overwriting real code with placeholder comments from the Dev agent.** When `claude -p` runs the Dev agent, the agent has access to native filesystem tools (Write/Edit/Bash). It would write real Python code to disk, run pytest, validate with ruff, then in its final message include `file:path` blocks with only short comment placeholders ("# argparse + main here"). The orchestrator parsed those placeholders and **clobbered the real implementation**.
- **Two-part fix:**
  1. `extractAndWriteArtifacts` in the orchestrator now detects placeholder-looking content (short + only comments + specific phrases like "full file already written") and refuses to overwrite an existing file that has meaningfully more content.
  2. The Dev agent prompt (`assets/agents/dev.md`) now explicitly forbids using native filesystem tools — all code must arrive in `file:path` blocks. Bash is still allowed only for `pytest`/`ruff`/`tsc` verification.
- Caught by the second real end-to-end smoke test (the first one caught the `claude-cli` stdin bug fixed in 0.3.2). Without these real tests we would have shipped a framework whose Implementation phase silently destroys its own output.

---

## [0.3.2] — 2026-05-25

### Fixed
- **CRITICAL: `ClaudeCliProvider` was passing prompts as shell arguments**, which the Windows shell truncated when prompts contained newlines or special characters. Every agent received only `#` (the first character of `# System\n...`) and responded with "I see an empty prompt". As a result, no artifacts were ever generated when using the `claude-cli` provider.
- The provider now sends prompts via stdin (`echo prompt | claude -p`), which works reliably cross-platform.
- This bug existed in 0.3.0 and 0.3.1. Anyone using `--provider claude-cli` on those versions never got real output.

### Discovered by
- The first real end-to-end smoke test (none of the 61 unit tests caught it because they used a `MockProvider`).
- Lesson learned: do not trust unit tests alone — always run at least one real cycle with an LLM before publishing.

---

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
