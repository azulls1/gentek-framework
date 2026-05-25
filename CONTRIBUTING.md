# Contributing to IAgentek

Gracias por considerar contribuir a IAgentek. Esta guía te lleva del clone al PR mergeable en menos de 15 minutos.

## TL;DR
```bash
git clone https://github.com/azulls1/iagentek-framework
cd iagentek-framework
npm install
npm run build
npm test
```

Si los 4 comandos pasan, tu entorno está listo.

---

## Setup detallado

### Requisitos
- **Node.js >= 18.17.0** (probado en 18, 20, 22)
- **npm >= 9** (incluido con Node moderno)
- **Git** (cualquier versión reciente)
- Opcional: **Claude Code CLI** o una API key de algún provider para probar el ciclo end-to-end

### Estructura del monorepo
```
iagentek-framework/
├── packages/
│   ├── method/    # @iagentek/method — agentes BMAD + plantillas SDD + flows (assets markdown)
│   ├── core/      # @iagentek/core — providers, orchestrator, checkpoints, state
│   └── cli/       # @iagentek/cli — bin/iagentek.js, comandos init/cycle/status/resume/agent
├── iagentek-plugin/ # Plugin de Claude Code (slash commands + agents nativos)
├── scripts/       # Scripts de build/publish
├── .github/       # CI, issue templates
└── docs raíz:     # README, ARCHITECTURE, CHANGELOG, PUBLISHING, etc.
```

### Orden de build (importante)
Los paquetes tienen dependencias entre sí: `cli → core → method`. El script `npm run build` los compila en el orden correcto. Si compilas manualmente uno por uno, respeta este orden.

---

## Workflow de un cambio

### 1. Issue primero (recomendado)
Antes de invertir tiempo en un cambio grande, abre un issue para alinear scope. Cambios pequeños (bugfix, typo, mejora menor) van directo a PR.

### 2. Branch
```bash
git checkout -b fix/short-descriptive-slug
# o
git checkout -b feat/short-descriptive-slug
```

### 3. Código
- Si añades un agente BMAD: crea el `.md` en `packages/method/assets/agents/` Y añade la entrada en el `AgentRole` type de `packages/method/src/index.ts`.
- Si añades un provider de IA: implementa `AIProvider` en `packages/core/src/providers/`, regístralo en `factory.ts`, añade detección en `detect.ts`, exporta desde `index.ts`.
- Si añades un flow: crea el `.yaml` en `packages/method/assets/flows/`. El orchestrator lo carga automáticamente.

### 4. Tests
Tests vivien en `packages/<paquete>/test/`. Usa Vitest. Mínimo:
- Test unitario del nuevo código
- Si tocas el orchestrator, un test de integración con un mock provider

```bash
npm test                  # corre todos los tests
npm run test:watch        # modo watch
```

### 5. Build local
```bash
npm run build
```
Tiene que pasar sin errores antes de mergear (el CI bloquea).

### 6. Smoke test del CLI
```bash
node packages/cli/dist/bin/iagentek.js --help
node packages/cli/dist/bin/iagentek.js init demo --provider claude-cli --cwd /tmp/gentek-test
```

### 7. Commit
- Mensajes en imperativo presente: "add", "fix", "remove", no "added"/"fixed".
- Una idea por commit. Si tu PR tiene 7 cambios independientes, 7 commits.

### 8. PR
Sigue el template (`.github/PULL_REQUEST_TEMPLATE.md`). Incluye:
- Qué cambió y por qué
- Cómo probarlo
- Screenshots si aplica
- Issue que cierra (si aplica)

---

## Estilo de código

### TypeScript
- `strict: true` ya configurado en `tsconfig.base.json` — sin negociación.
- Sin `any` salvo con comentario justificando.
- Prefiere `interface` sobre `type` para shapes de objetos públicos.
- Imports relativos terminan en `.js` (ESM con NodeNext).

### Markdown
- Línea blanca antes y después de bloques de código.
- Sin emojis decorativos a menos que el README los pida explícitamente.
- Headings en oraciones (`## Mi heading`, no `## My Heading`).

### Agentes BMAD (prompts en `packages/method/assets/agents/`)
- Empieza con `# Agent: <Nombre>`.
- Secciones obligatorias: **Identidad**, **Principios**, **Inputs esperados**, **Tu proceso**, **Outputs**, **Checkpoint**, **Qué NO hacer**.
- Tono directo y opinionado — el agente es un experto, no un asistente neutral.

---

## Cómo correr el CLI con cambios locales

```bash
# Después de un build
npm link -w @iagentek/cli

# Ahora `iagentek` está disponible globalmente apuntando a tu copia local
iagentek --version
iagentek init test-local
```

Para deshacer:
```bash
npm unlink -g @iagentek/cli
```

---

## Reportar bugs

1. Verifica que no exista ya un issue similar.
2. Usa el template "Bug report" en `.github/ISSUE_TEMPLATE/`.
3. Incluye versión de Node, OS, salida del comando, qué esperabas vs qué pasó.

## Proponer features

1. Issue "Feature request" antes de codear.
2. Describe el problema que resuelve, no la solución que imaginas.
3. Si afecta a un agente BMAD o flow existente, justifica por qué el cambio no rompe la promesa de SDD (specs como contrato).

---

## Código de conducta

Este proyecto sigue el [Código de Conducta](./CODE_OF_CONDUCT.md). Al contribuir, aceptas honrarlo.

## Licencia

Al enviar un PR, aceptas que tu contribución se publica bajo [MIT](./LICENSE).
