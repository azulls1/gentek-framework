---
description: Invoca un agente BMAD aislado (analyst, pm, architect, scrum-master, dev, qa, devops, debugger, refactor-architect)
argument-hint: <role> [--prompt "instrucción extra"]
---

Ejecuta `npx @gentek/cli agent $ARGUMENTS` con la herramienta Bash en el directorio actual.

Si el usuario no especificó role, primero pregunta con AskUserQuestion cuál de los agentes BMAD usar:
- analyst (discovery, problema)
- pm (PRD, specs)
- architect (stack, diseño)
- scrum-master (stories, tasks)
- dev (implementación)
- qa (validación)
- devops (CI/CD, release)
- debugger (bugs, incidentes)
- refactor-architect (deuda técnica)

Luego pregunta si quiere agregar una instrucción adicional al contexto del proyecto, o si basta con el contexto actual.
