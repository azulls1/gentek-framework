# Publicación a npm

Guía para publicar los 3 paquetes del monorepo IAgentek (`@iagentek/method`, `@iagentek/core`, `@iagentek/cli`) al registry público de npm.

## Pre-requisitos

1. **Cuenta en npm** con acceso al scope `@iagentek`. Si el scope no existe, créalo desde [npmjs.com](https://www.npmjs.com/) o publica la primera versión como autor — npm creará el scope automáticamente.
2. **Token de publicación** (`npm token create`) o `npm login` con 2FA habilitada.
3. **Build limpio** del monorepo: `npm run build`.

## Orden obligatorio de publicación

Los paquetes tienen dependencias internas. Publicar en este orden:

```bash
npm publish -w @iagentek/method     # 1º — no depende de nadie
npm publish -w @iagentek/core       # 2º — depende de @iagentek/method
npm publish -w @iagentek/cli        # 3º — depende de @iagentek/core + @iagentek/method
```

> ⚠️ Si una versión interna apunta a `"0.3.0"` y aún no publicaste esa versión del dependiente, npm fallará. Bumpea versiones en orden.

## Pasos completos

```bash
# 1. Limpia y construye
npm run clean
npm install
npm run build

# 2. Login (si no tienes token guardado)
npm login

# 3. Verifica qué se va a publicar (dry-run)
npm publish --dry-run -w @iagentek/method
npm publish --dry-run -w @iagentek/core
npm publish --dry-run -w @iagentek/cli

# 4. Publica en orden
npm publish -w @iagentek/method
npm publish -w @iagentek/core
npm publish -w @iagentek/cli

# 5. Verifica
npm view @iagentek/cli
npm view @iagentek/core
npm view @iagentek/method
```

## Tag de release en GitHub

```bash
git tag -a v0.3.0 -m "Release 0.3.0 — full BMAD pipeline + 6 providers + plugin Claude Code"
git push origin v0.3.0
```

Luego desde la UI de GitHub crea un Release apuntando al tag con changelog.

## Bump de versiones

Para subir todas a una nueva versión simultáneamente:

```bash
npm version 0.4.0 -w @iagentek/method
npm version 0.4.0 -w @iagentek/core
npm version 0.4.0 -w @iagentek/cli
```

Y actualiza las referencias internas en `dependencies` de cada `package.json`.

## Verificación post-publicación

```bash
# Desde un directorio temporal
mkdir /tmp/iagentek-smoke && cd /tmp/iagentek-smoke
npx @iagentek/cli init demo --provider claude-cli
cd demo
npx @iagentek/cli status
```
