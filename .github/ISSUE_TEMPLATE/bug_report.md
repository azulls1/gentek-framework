---
name: 🐛 Bug report
about: Reporta un comportamiento inesperado o un crash
title: "[Bug] "
labels: bug, needs-triage
assignees: ''
---

## Resumen
<!-- 1-2 frases describiendo el bug -->

## Pasos para reproducir
1. Ejecuté `...`
2. Hice `...`
3. Vi `...`

## Comportamiento esperado
<!-- Qué esperabas que pasara -->

## Comportamiento actual
<!-- Qué pasó en realidad. Pega salida completa del comando si aplica. -->

```
[salida del comando]
```

## Entorno
- **Versión de Gentek:** (output de `npx @gentek/cli --version`)
- **Provider usado:** anthropic / claude-cli / openai / ...
- **Node.js:** (output de `node --version`)
- **npm:** (output de `npm --version`)
- **OS:** Windows / macOS / Linux (especifica versión)
- **Flow:** greenfield / brownfield / bugfix / refactor

## Archivos relevantes (si aplica)
- Contenido de `.gentek/config.yaml` (sin secretos)
- Contenido de `.gentek/state.json`
- Transcripts en `.gentek/.transcripts/` que muestran el fallo

## Checklist
- [ ] Verifiqué que no hay otro issue abierto con este bug
- [ ] Reproduje el bug en una versión limpia (sin modificaciones locales)
- [ ] Eliminé información sensible (API keys, datos privados) del reporte
