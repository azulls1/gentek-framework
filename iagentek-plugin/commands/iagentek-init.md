---
description: Bootstrap IAgentek en un proyecto (greenfield o brownfield)
argument-hint: [nombre-proyecto] [--flow greenfield|brownfield]
---

Ejecuta `npx @iagentek/cli init $ARGUMENTS` en el directorio actual usando la herramienta Bash.

Si el usuario no pasó argumentos, primero pregunta con AskUserQuestion:
1. Nombre del proyecto (o "." si ya está en la carpeta)
2. Flow inicial: greenfield, brownfield, bugfix, refactor
3. Provider de IA: claude-cli, anthropic, openai, gemini, deepseek, ollama

Después de ejecutar el comando, muestra los próximos pasos sugeridos:
- `cd <nombre>` si creó subdirectorio
- `/iagentek-cycle` para arrancar el ciclo
- `/iagentek-status` para ver el estado actual
