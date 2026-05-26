# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] — 2026-05-26

### Added — Bilingual output (English / Spanish)
- **The framework now ships in two fully-supported output languages.** Users choose `English` or `Español` at `init` time (interactive prompt) or via `--lang en|es`. The choice persists in `.iagentek/config.yaml` as `language: en | es` and can be overridden per cycle with `iagentek cycle --lang es`.
- Auto-detection of the system locale (`LANG`, `LC_ALL`, `LC_MESSAGES`) suggests Spanish when the OS is configured for `es_*`.
- Assets reorganized:
  - `packages/method/assets/en/{agents,templates,flows}/` — English (default, canonical)
  - `packages/method/assets/es/{agents,templates,flows}/` — Spanish equivalents
- New public types and helpers from `@iagentek/method`:
  - `Lang = 'en' | 'es'`
  - `SUPPORTED_LANGS`, `DEFAULT_LANG`
  - `detectSystemLang()`
  - `loadAgent(role, lang?)`, `loadTemplate(name, lang?)`, `loadFlow(name, lang?)` — all accept an optional `lang` parameter with fallback to English when an asset is missing in the requested language.
- New CLI flags: `iagentek init --lang en|es`, `iagentek cycle --lang en|es`.
- `iagentek status` now displays the configured language.
- The orchestrator injects a `LANGUAGE:` instruction into every agent's context so the LLM produces artifacts in the chosen language.

### Backward compatibility
- Configs from 0.3.x without a `language` field automatically default to `en` when loaded.
- All public APIs accept `lang` as an optional parameter; existing call sites that pass no lang continue to work unchanged (English).

### Skipped
- v0.3.4 was committed locally but never published to npm — superseded by v0.4.0 which contains everything 0.3.4 had plus bilingual support.

---

## [0.3.4] — 2026-05-26 (never published)

### Changed
- **Full English translation of all product internals.** Previously the prompts of the 9 BMAD agents, the 9 SDD templates, the 4 flow YAMLs, and the orchestrator/CLI strings were in Spanish. The generated artifacts (`project-brief.md`, `PRD.md`, `architecture.md`, etc.) consequently came out in Spanish, which was inconsistent with the English README and the international audience IAgentek targets.
- Translated:
  - 9 agent prompts (`assets/agents/*.md`): Analyst, PM, Architect, Scrum Master, Dev, QA, DevOps, Debugger, Refactor Architect
  - 9 SDD templates (`assets/templates/*.md`): constitution, project-brief, PRD, spec, plan, tasks, story, architecture, current-state
  - 4 flow YAML files (`assets/flows/*.yaml`): greenfield, brownfield, bugfix, refactor — checkpoint prompts and summaries
  - Codebase analyzer output strings (`summarizeAnalysis()`)
  - Orchestrator strings (phase headers, checkpoint pauses, builtin agent dim text)
  - All CLI command strings (init, cycle, status, resume, agent — prompts, errors, success messages)
  - Package descriptions in all 4 `package.json` files
- Default language directive added to every agent's instruction context: outputs in English unless the user's idea is in another language (the framework respects user-driven multilingual projects).

### Fixed
- pyproject.toml parser in the codebase analyzer no longer leaks TOML keys (`build-backend`, `requires-python`, `license`, `description`, etc.) as if they were package dependencies. Now it parses `[project] dependencies = [...]`, `[project.optional-dependencies]`, and `[tool.poetry.dependencies]` correctly. Caught during brownfield smoke test.
- Stronger Dev agent prompt: mandates running the full test suite (`pytest`/`npm test`/`go test`/`cargo test`) before closing the implementation phase and reporting `X passed / Y failed / Z errors / W skipped` in the summary.
- Stronger QA agent prompt: defaults to `scope="function"` for pytest fixtures (avoids `ScopeMismatch` errors seen in 0.3.3 smoke test); forbids network/time-dependent tests; mandates `--randomly`-safe ordering.

### Docs
- Added shields.io badges to both READMEs (npm version, CI status, MIT license, Node version, npm downloads)
- New "Quick smoke test" section in README — copy-pasteable script anyone can run to verify end-to-end in ~30 min
- README.es.md gets a "🇬🇧 Also available in English" link back

---

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
