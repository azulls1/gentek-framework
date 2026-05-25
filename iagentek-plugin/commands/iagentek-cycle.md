---
description: Ejecuta el ciclo IAgentek completo con checkpoints (lee config del proyecto)
argument-hint: [--flow greenfield|brownfield|bugfix|refactor] [--idea "..."]
---

Ejecuta `npx @iagentek/cli cycle $ARGUMENTS` con la herramienta Bash en el directorio actual.

Antes de ejecutar:
1. Verifica que existe `.iagentek/config.yaml` — si no, sugiere correr `/iagentek-init` primero.
2. Si el usuario no pasó `--idea` y el proyecto no tiene `.iagentek/project-brief.md`, pregunta la idea del producto en 1-3 frases con AskUserQuestion.

Después del ciclo:
- Si terminó completo, sugiere `/iagentek-status` para ver el resumen.
- Si quedó en pausa por un checkpoint, indica al usuario qué archivo revisar y cómo retomar con `/iagentek-resume`.
