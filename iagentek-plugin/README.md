# IAgentek — Claude Code Plugin

Plugin de Claude Code que expone el método **IAgentek** (Spec-Driven Development + BMAD) como **slash commands** y **agentes** nativos, complementando el CLI `@iagentek/cli`.

## Qué incluye

### Slash commands
- `/iagentek-init` — Bootstrap (greenfield/brownfield/bugfix/refactor)
- `/iagentek-cycle` — Ejecuta el ciclo con checkpoints
- `/iagentek-status` — Estado del proyecto
- `/iagentek-resume` — Retoma desde el último checkpoint
- `/iagentek-agent` — Invoca un agente BMAD aislado

### Agentes invocables (`@iagentek-*`)
| Agente | Rol |
|---|---|
| `iagentek-analyst` | Discovery y definición de problema |
| `iagentek-pm` | PRD + specs |
| `iagentek-architect` | Stack, diseño técnico, plans por feature |
| `iagentek-scrum-master` | Stories + tasks atómicas + DoD |
| `iagentek-dev` | Implementación con tests |
| `iagentek-qa` | Validación de ACs + reportes |
| `iagentek-devops` | CI/CD + infra + runbook |
| `iagentek-debugger` | Bug + causa raíz + postmortem |
| `iagentek-refactor-architect` | Audit de deuda + migration plan |

## Instalación en Claude Code

```bash
# Desde Claude Code, agrega este plugin apuntando al repo y subpath:
/plugin add github.com/azulls1/iagentek-framework path:iagentek-plugin
```

(Sintaxis exacta puede variar según versión de Claude Code — consulta `/plugin --help`.)

## Requisito previo
Los slash commands invocan `npx @iagentek/cli` bajo el capó, así que necesitas Node 18+ en tu PATH. Los agentes funcionan independientemente (usan tools nativas de Claude Code).

## Cómo funciona la doble pista
- **Slash commands** = ejecutan el CLI completo (con orchestrator, providers, checkpoints, state). Usa esto cuando quieras correr el ciclo end-to-end.
- **Agentes** = corren dentro de Claude Code usando Read/Write/Edit nativos, sin pasar por el CLI. Usa esto cuando quieras consultar a un rol específico para una tarea puntual.

## Más info
- Framework completo: [github.com/azulls1/iagentek-framework](https://github.com/azulls1/iagentek-framework)
