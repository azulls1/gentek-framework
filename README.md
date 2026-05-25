# Gentek

> Framework de desarrollo autónomo asistido por IA para equipos de programadores.
> Fusiona **Spec-Driven Development** (specs como source-of-truth) con **BMAD Method** (agentes especializados con roles claros).

Un comando, un ciclo entero. Greenfield o brownfield. Claude por default, cualquier IA por API key.

```bash
npx @gentek/cli init mi-producto
cd mi-producto
npx @gentek/cli cycle --idea "Quiero un sistema de tickets para soporte que..."
```

---

## ¿Qué hace?

Gentek orquesta un equipo virtual de agentes (Analyst → PM → Architect → Scrum Master → Dev → QA → DevOps) que pasan por un ciclo de desarrollo completo. Cada agente produce artefactos **spec-driven** (constitución, PRD, specs, plans, tasks, stories) que son la fuente de verdad del proyecto. Tú apruebas en checkpoints clave y el ciclo sigue.

**Modos de ejecución:**
- `autonomous-with-checkpoints` (default) — corre solo, se detiene en momentos clave
- `fully-autonomous` — end-to-end sin parar
- `interactive` — pregunta en cada paso

**Ciclos disponibles:**
- `greenfield` — producto desde cero ✅ MVP
- `brownfield` — sobre código existente ⏳ iteración 2
- `bugfix` — incident response ⏳ iteración 3
- `refactor` — tech-debt ⏳ iteración 3

---

## Quick start

### 1) Bootstrap

```bash
npx @gentek/cli init mi-producto
```

Te preguntará el provider de IA. Detecta automáticamente:
- `claude` CLI en PATH (reusa auth de Claude Code)
- `ANTHROPIC_API_KEY` env var
- `OPENAI_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY` (iteración 2)
- `ollama` CLI local (iteración 2)

Si no hay nada configurado, te pide la API key y la guarda en `.env` (con `.gitignore` automático).

### 2) Ejecutar el ciclo

```bash
cd mi-producto
npx @gentek/cli cycle --idea "App móvil para reservar canchas de pádel con pagos integrados"
```

Verás:
```
🔁 Gentek cycle — greenfield  (proyecto: mi-producto)
Provider: anthropic  |  Modo: autonomous-with-checkpoints

🛠  Fase: Discovery & Problem Definition  (agente: analyst)
  📝 Artefactos generados:
     - .gentek/project-brief.md
     - .gentek/constitution.md

🚦 Checkpoint: discovery-approved
El Analyst generó el project brief y la constitución del proyecto.
Revisa los archivos y aprueba para continuar a la definición de features.

? ¿Cómo procedemos? › Aprobar y continuar
```

### 3) Ver el estado

```bash
npx @gentek/cli status
```

---

## Estructura que se genera en tu proyecto

```
mi-producto/
├── .env                       # API key (gitignored)
├── .gitignore
└── .gentek/
    ├── config.yaml            # provider, flow, modo, checkpoints
    ├── state.json             # tracking de fases (gitignored)
    ├── constitution.md        # principios no-negociables (SDD)
    ├── project-brief.md       # output del Analyst
    ├── PRD.md                 # output del PM
    ├── architecture.md        # output del Architect
    ├── specs/                 # specs SDD por feature
    │   ├── auth.md
    │   └── booking.md
    ├── plans/                 # plans técnicos por feature
    │   ├── auth.md
    │   └── booking.md
    ├── stories/               # user stories (iteración 2)
    ├── tasks/                 # tasks atómicas (iteración 2)
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

**En Gentek:** los agentes BMAD son los ejecutores; los artefactos SDD son el contrato. Cada agente lee artefactos previos como input y produce los suyos como output. El humano aprueba en checkpoints.

---

## Arquitectura del framework

Ver [ARCHITECTURE.md](./ARCHITECTURE.md).

Monorepo con 3 paquetes npm:
- `@gentek/cli` — CLI ejecutable por `npx`
- `@gentek/core` — providers de IA, orchestrator, checkpoints, state
- `@gentek/method` — agentes BMAD + plantillas SDD (markdown puro)

---

## Desarrollo local (contribuir)

```bash
# clonar
git clone <repo>
cd FramworkGentek

# instalar deps de todos los workspaces
npm install

# build de todos los paquetes
npm run build

# link global para usar `gentek` directamente
cd packages/cli
npm link

# ahora puedes correr
gentek init test-project
cd test-project
gentek cycle --idea "una idea de prueba"
```

---

## Roadmap

**Iteración 1 (MVP — actual):**
- ✅ Monorepo + TypeScript
- ✅ `gentek init`, `gentek cycle`, `gentek status`
- ✅ Provider: Anthropic + Claude CLI con auto-detección
- ✅ Agentes: Analyst, PM, Architect
- ✅ Flow: greenfield
- ✅ Checkpoints interactivos

**Iteración 2:**
- Agentes Dev, QA, DevOps
- Flow brownfield (con análisis del código existente)
- Providers OpenAI, Gemini, DeepSeek, Ollama
- Comando `gentek resume`
- Comando `gentek agent <role>` (invocación aislada)

**Iteración 3:**
- Flows bugfix y refactor
- Plugin de Claude Code complementario (`/gentek` slash commands)
- Publicación oficial a npm
- Web UI opcional para visualizar el estado del ciclo

---

## Licencia

MIT
