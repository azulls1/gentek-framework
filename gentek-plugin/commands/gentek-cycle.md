---
description: Ejecuta el ciclo Gentek completo con checkpoints (lee config del proyecto)
argument-hint: [--flow greenfield|brownfield|bugfix|refactor] [--idea "..."]
---

Ejecuta `npx @gentek/cli cycle $ARGUMENTS` con la herramienta Bash en el directorio actual.

Antes de ejecutar:
1. Verifica que existe `.gentek/config.yaml` — si no, sugiere correr `/gentek-init` primero.
2. Si el usuario no pasó `--idea` y el proyecto no tiene `.gentek/project-brief.md`, pregunta la idea del producto en 1-3 frases con AskUserQuestion.

Después del ciclo:
- Si terminó completo, sugiere `/gentek-status` para ver el resumen.
- Si quedó en pausa por un checkpoint, indica al usuario qué archivo revisar y cómo retomar con `/gentek-resume`.
