# Política de seguridad

## Versiones soportadas

Solo la última versión menor publicada en npm recibe parches de seguridad.

| Versión | Soportada |
|---|---|
| 0.3.x | ✅ |
| < 0.3 | ❌ |

## Reportar una vulnerabilidad

**No abras un issue público para vulnerabilidades de seguridad.**

Envía un correo a **azull.samael@gmail.com** con:
- Descripción del problema
- Pasos para reproducir
- Impacto estimado (qué se puede comprometer)
- Versión afectada
- Si aplica: PoC mínimo

### Qué esperar

- **Acuse de recibo:** en máximo 72 horas.
- **Evaluación inicial:** en máximo 7 días.
- **Coordinación de disclosure:** acordamos una ventana para parchear antes de publicar.

### Reglas del juego

- No explotes la vulnerabilidad más allá de lo necesario para demostrarla.
- No accedas a datos de terceros.
- Si encuentras un secreto leaked, no lo uses — repórtalo.

## Alcance

Esta política cubre:
- Los 3 paquetes npm: `@gentek/cli`, `@gentek/core`, `@gentek/method`
- El plugin de Claude Code en `gentek-plugin/`
- Scripts del repo (`scripts/`)

**Fuera de alcance:**
- Vulnerabilidades en dependencias upstream (repórtalas al proyecto correspondiente; nosotros las actualizamos cuando se publica el parche).
- Comportamiento mal configurado por el usuario (e.g., subir `.env` al repo).
- Vulnerabilidades que requieren acceso físico o root local previo.

## Reconocimientos

Si tu reporte resulta en un parche, te listamos en el `CHANGELOG.md` salvo que prefieras anonimato.
