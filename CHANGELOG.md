# Changelog

Todos los cambios notables a este proyecto se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] — 2026-05-25

### Agregado
- **Flows bugfix y refactor** completos con sus agentes especializados.
- **Agente Debugger** — incident response: reproducción → causa raíz → fix con test → postmortem.
- **Agente Refactor Architect** — auditoría de deuda, priorización por dolor×esfuerzo, migration plan por etapas con tests de caracterización y rollback.
- **Plugin de Claude Code** (`iagentek-plugin/`) con:
  - 5 slash commands: `/iagentek-init`, `/iagentek-cycle`, `/iagentek-status`, `/iagentek-resume`, `/iagentek-agent`.
  - 9 agentes invocables (`@iagentek-analyst` … `@iagentek-refactor-architect`).
- **Paquetes preparados para publicación a npm:** READMEs por paquete, LICENSE MIT, campos `repository`/`bugs`/`homepage`/`keywords`/`publishConfig` en cada `package.json`.
- **PUBLISHING.md** — guía completa de publicación con orden de dependencias.
- **CHANGELOG.md** — este archivo.

### Modificado
- `AgentRole` actualizado en `@iagentek/method` para incluir `debugger` y `refactor-architect`.
- README principal expandido con secciones para los 4 flows, 9 agentes, 6 providers y el plugin de Claude Code.

---

## [0.2.0] — 2026-05-25

### Agregado
- **4 agentes BMAD nuevos** con prompts completos: Scrum Master, Dev, QA, DevOps.
- **Flow brownfield** completo con agente builtin `__codebase__` que ejecuta `analyzeCodebase()` antes del Analyst.
- **Analizador de codebase** (`analyzeCodebase`) en `@iagentek/core/analysis` — detecta lenguajes, package managers (node/python/go/rust/ruby/java/php), frameworks (React, Next, Vue, Django, FastAPI, Express, etc.), README.
- **4 providers nuevos:** OpenAI, Gemini, DeepSeek, Ollama.
- **2 comandos CLI nuevos:**
  - `iagentek resume` — retoma desde la última fase.
  - `iagentek agent <role>` — invoca cualquier agente aislado con contexto completo.
- **Greenfield ahora tiene las 7 fases activas** (antes solo 3: discovery, definition, design).
- **Plantilla** `current-state.md` para análisis brownfield.

### Modificado
- `ConfigManager.defaultConfig` ahora incluye checkpoints para las 4 fases nuevas.
- `Orchestrator` soporta agentes builtin con prefijo `__nombre__`.

---

## [0.1.0] — 2026-05-25

### Agregado
- MVP inicial del framework.
- Monorepo con 3 paquetes: `@iagentek/cli`, `@iagentek/core`, `@iagentek/method`.
- Comandos CLI: `init`, `cycle`, `status`.
- Provider Anthropic y Claude CLI con auto-detección.
- 3 agentes BMAD (Analyst, PM, Architect) con prompts completos; otros 4 como stubs.
- Flow greenfield con 3 fases activas.
- Sistema de checkpoints interactivos con 3 modos (required/auto/skip).
- State manager (`state.json`) y config manager (`config.yaml`).
- Plantillas SDD: constitution, project-brief, PRD, spec, plan, tasks, story, architecture.
- README + ARCHITECTURE.md.
