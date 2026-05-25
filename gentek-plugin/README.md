# Gentek — Claude Code Plugin

Plugin de Claude Code que expone el método **Gentek** (Spec-Driven Development + BMAD) como **slash commands** y **agentes** nativos, complementando el CLI `@gentek/cli`.

## Qué incluye

### Slash commands
- `/gentek-init` — Bootstrap (greenfield/brownfield/bugfix/refactor)
- `/gentek-cycle` — Ejecuta el ciclo con checkpoints
- `/gentek-status` — Estado del proyecto
- `/gentek-resume` — Retoma desde el último checkpoint
- `/gentek-agent` — Invoca un agente BMAD aislado

### Agentes invocables (`@gentek-*`)
| Agente | Rol |
|---|---|
| `gentek-analyst` | Discovery y definición de problema |
| `gentek-pm` | PRD + specs |
| `gentek-architect` | Stack, diseño técnico, plans por feature |
| `gentek-scrum-master` | Stories + tasks atómicas + DoD |
| `gentek-dev` | Implementación con tests |
| `gentek-qa` | Validación de ACs + reportes |
| `gentek-devops` | CI/CD + infra + runbook |
| `gentek-debugger` | Bug + causa raíz + postmortem |
| `gentek-refactor-architect` | Audit de deuda + migration plan |

## Instalación en Claude Code

```bash
# Desde Claude Code, agrega este plugin apuntando al repo y subpath:
/plugin add github.com/azulls1/gentek-framework path:gentek-plugin
```

(Sintaxis exacta puede variar según versión de Claude Code — consulta `/plugin --help`.)

## Requisito previo
Los slash commands invocan `npx @gentek/cli` bajo el capó, así que necesitas Node 18+ en tu PATH. Los agentes funcionan independientemente (usan tools nativas de Claude Code).

## Cómo funciona la doble pista
- **Slash commands** = ejecutan el CLI completo (con orchestrator, providers, checkpoints, state). Usa esto cuando quieras correr el ciclo end-to-end.
- **Agentes** = corren dentro de Claude Code usando Read/Write/Edit nativos, sin pasar por el CLI. Usa esto cuando quieras consultar a un rol específico para una tarea puntual.

## Más info
- Framework completo: [github.com/azulls1/gentek-framework](https://github.com/azulls1/gentek-framework)
