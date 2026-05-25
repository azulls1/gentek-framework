# @gentek/cli

CLI npx-ejecutable del framework **Gentek** (Spec-Driven Development + BMAD Method).

```bash
npx @gentek/cli init mi-producto
cd mi-producto
npx @gentek/cli cycle --idea "lo que quieras construir"
```

## Comandos

| Comando | Descripción |
|---|---|
| `init [name]` | Bootstrap `.gentek/` con config + state |
| `cycle` | Ejecuta el flow completo con checkpoints |
| `status` | Estado de fases, checkpoints, próximos pasos |
| `resume` | Retoma desde la última fase pausada |
| `agent <role>` | Invoca un agente BMAD aislado |

## Providers soportados (auto-detectados)
- `claude-cli` (reusa auth de Claude Code)
- `anthropic` (`ANTHROPIC_API_KEY`)
- `openai` (`OPENAI_API_KEY`)
- `gemini` (`GEMINI_API_KEY`)
- `deepseek` (`DEEPSEEK_API_KEY`)
- `ollama` (local en `:11434`)

## Flows
- `greenfield` — producto desde cero (7 fases)
- `brownfield` — sobre código existente (8 fases, incluye análisis previo)
- `bugfix` — incident response corto
- `refactor` — reducción de tech-debt por etapas

## Docs completas
[github.com/azulls1/gentek-framework](https://github.com/azulls1/gentek-framework)
