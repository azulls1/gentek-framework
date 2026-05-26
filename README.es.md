# IAgentek

[![npm version](https://img.shields.io/npm/v/@iagentek/cli.svg?label=npm&color=cb3837)](https://www.npmjs.com/package/@iagentek/cli)
[![CI](https://img.shields.io/github/actions/workflow/status/azulls1/iagentek-framework/ci.yml?branch=main&label=CI)](https://github.com/azulls1/iagentek-framework/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/node/v/@iagentek/cli.svg)](https://nodejs.org)
[![npm downloads](https://img.shields.io/npm/dm/@iagentek/cli.svg)](https://www.npmjs.com/package/@iagentek/cli)

> 🇬🇧 Also available in [English](./README.md)

> Framework de desarrollo autónomo asistido por IA para equipos de programadores.
> Fusiona **Spec-Driven Development** (specs como source-of-truth) con **BMAD Method** (agentes especializados con roles claros).

Un comando, un ciclo entero. Greenfield, brownfield, bugfix o refactor. Claude por default, cualquier IA por API key. Disponible como **CLI `npx`** o como **plugin de Claude Code**.

```bash
npx @iagentek/cli init mi-producto
cd mi-producto
npx @iagentek/cli cycle --idea "Quiero un sistema de tickets para soporte que..."
```

O desde Claude Code:
```
/iagentek-init mi-producto
/iagentek-cycle --idea "..."
```

---

## ¿Qué hace?

IAgentek orquesta un equipo virtual de agentes (Analyst → PM → Architect → Scrum Master → Dev → QA → DevOps + Debugger + Refactor Architect) que pasan por un ciclo de desarrollo completo. Cada agente produce artefactos **spec-driven** (constitución, PRD, specs, plans, tasks, stories) que son la fuente de verdad del proyecto. Tú apruebas en checkpoints clave y el ciclo sigue.

**Modos de ejecución:**
- `autonomous-with-checkpoints` (default) — corre solo, se detiene en momentos clave
- `fully-autonomous` — end-to-end sin parar
- `interactive` — pregunta en cada paso

**4 ciclos completos:**
- `greenfield` — producto desde cero (7 fases)
- `brownfield` — sobre código existente (8 fases, análisis previo automático)
- `bugfix` — incident response corto (triage → repro → fix → postmortem)
- `refactor` — reducción de tech-debt por etapas (audit → migration plan → ejecución segura)

**6 providers de IA (auto-detectados):**
| Provider | Cómo se detecta | Default model |
|---|---|---|
| `claude-cli` | comando `claude` en PATH | claude-opus-4-7 |
| `anthropic` | `ANTHROPIC_API_KEY` | claude-opus-4-7 |
| `openai` | `OPENAI_API_KEY` | gpt-4o |
| `gemini` | `GEMINI_API_KEY` | gemini-2.0-flash |
| `deepseek` | `DEEPSEEK_API_KEY` | deepseek-chat |
| `ollama` | comando `ollama` en PATH | llama3.1 |

**9 agentes BMAD:**
Analyst · PM · Architect · Scrum Master · Dev · QA · DevOps · Debugger · Refactor Architect.

---

## Quick start (CLI)

### 1) Bootstrap
```bash
npx @iagentek/cli init mi-producto
```
Detecta automáticamente el provider disponible. Si necesitas API key y no está en env, te la pide y la guarda en `.env` (con `.gitignore` automático).

### 2) Ejecutar el ciclo
```bash
cd mi-producto
npx @iagentek/cli cycle --idea "App móvil para reservar canchas de pádel"
```

### 3) Comandos disponibles
| Comando | Qué hace |
|---|---|
| `init [name]` | Bootstrap `.iagentek/` con config + state |
| `cycle [--flow X] [--idea "..."]` | Ejecuta el ciclo con checkpoints |
| `status` | Muestra fases, checkpoints aprobados, próximos pasos |
| `resume` | Retoma desde la última fase pausada |
| `agent <role> [--prompt "..."]` | Invoca un agente BMAD aislado |

---

## Quick start (Claude Code plugin)

Instala el plugin apuntando a este repo:
```
/plugin add github.com/azulls1/iagentek-framework path:iagentek-plugin
```

Comandos disponibles después de instalar:
- `/iagentek-init` — bootstrap interactivo
- `/iagentek-cycle` — ciclo completo
- `/iagentek-status` — estado actual
- `/iagentek-resume` — retoma desde checkpoint
- `/iagentek-agent` — invoca un agente

Agentes invocables como `@iagentek-analyst`, `@iagentek-pm`, `@iagentek-architect`, etc.

Ver detalles en [`iagentek-plugin/README.md`](./iagentek-plugin/README.md).

---

## Estructura que se genera en tu proyecto

```
mi-producto/
├── .env                       # API key (gitignored)
├── .gitignore
└── .iagentek/
    ├── config.yaml            # provider, flow, modo, checkpoints
    ├── state.json             # tracking de fases (gitignored)
    ├── constitution.md        # principios no-negociables (SDD)
    ├── project-brief.md       # output del Analyst
    ├── current-state.md       # solo en brownfield/bugfix/refactor (auto)
    ├── PRD.md                 # output del PM
    ├── architecture.md        # output del Architect
    ├── sprint-plan.md         # output del Scrum Master
    ├── DoD.md                 # Definition of Done
    ├── specs/                 # specs SDD por feature
    ├── plans/                 # plans técnicos por feature
    ├── stories/               # user stories (sprint)
    ├── tasks/                 # tasks atómicas (1-4h)
    ├── qa/                    # reportes de QA por story
    ├── deployment.md          # runbook de DevOps
    ├── incidents/             # postmortems (solo bugfix)
    ├── debt-audit.md          # auditoría (solo refactor)
    ├── refactor-plans/        # planes por etapas (solo refactor)
    └── .transcripts/          # outputs crudos de cada agente (gitignored)
```

---

## Fusión SDD + BMAD

| Aspecto | Lo que aporta SDD | Lo que aporta BMAD |
|---|---|---|
| Artefactos | Constitution, spec, plan, tasks | — |
| Agentes | — | Analyst, PM, Architect, SM, Dev, QA, DevOps |
| Filosofía | Specs son el contrato | Roles especializados ejecutan |
| Validación | Acceptance criteria verificables | Checkpoints humanos por fase |

**En IAgentek:** los agentes BMAD son los ejecutores; los artefactos SDD son el contrato. Cada agente lee artefactos previos como input y produce los suyos como output. El humano aprueba en checkpoints.

---

## Arquitectura del framework

Ver [ARCHITECTURE.md](./ARCHITECTURE.md). Monorepo con 3 paquetes npm + 1 plugin de Claude Code:

- `@iagentek/cli` — CLI ejecutable por `npx`
- `@iagentek/core` — providers de IA, orchestrator, checkpoints, state, codebase analyzer
- `@iagentek/method` — agentes BMAD + plantillas SDD + flows (markdown + YAML)
- `iagentek-plugin/` — plugin de Claude Code complementario (no se publica a npm)

---

## Desarrollo local

```bash
git clone https://github.com/azulls1/iagentek-framework
cd iagentek-framework
npm install
npm run build
node packages/cli/dist/bin/iagentek.js --help
```

## Publicación a npm
Ver [PUBLISHING.md](./PUBLISHING.md).

---

## Estado y roadmap

**v0.3.0 (actual — iteración 3):**
- ✅ 4 ciclos completos (greenfield, brownfield, bugfix, refactor)
- ✅ 9 agentes BMAD con prompts completos
- ✅ 6 providers de IA con auto-detección
- ✅ Plugin de Claude Code (5 slash commands + 9 agents)
- ✅ Paquetes preparados para publicación a npm
- ✅ Analizador automático de codebase para brownfield

**Próximas mejoras (no comprometidas):**
- Streaming de tokens en tiempo real
- Web UI para visualizar el ciclo
- Soporte para más providers (Mistral, Groq, Cohere)
- Loop real por story en la fase de implementación
- Cache de respuestas para reducir costos de IA

---

## Contribuir
Pull requests bienvenidos. Issues en [github.com/azulls1/iagentek-framework/issues](https://github.com/azulls1/iagentek-framework/issues).

## Licencia
MIT — ver [LICENSE](./LICENSE).
