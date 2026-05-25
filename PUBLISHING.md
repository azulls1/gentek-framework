# Publicación a npm

Guía para publicar los 3 paquetes del monorepo Gentek (`@gentek/method`, `@gentek/core`, `@gentek/cli`) al registry público de npm.

## Pre-requisitos

1. **Cuenta en npm** con acceso al scope `@gentek`. Si el scope no existe, créalo desde [npmjs.com](https://www.npmjs.com/) o publica la primera versión como autor — npm creará el scope automáticamente.
2. **Token de publicación** (`npm token create`) o `npm login` con 2FA habilitada.
3. **Build limpio** del monorepo: `npm run build`.

## Orden obligatorio de publicación

Los paquetes tienen dependencias internas. Publicar en este orden:

```bash
npm publish -w @gentek/method     # 1º — no depende de nadie
npm publish -w @gentek/core       # 2º — depende de @gentek/method
npm publish -w @gentek/cli        # 3º — depende de @gentek/core + @gentek/method
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
npm publish --dry-run -w @gentek/method
npm publish --dry-run -w @gentek/core
npm publish --dry-run -w @gentek/cli

# 4. Publica en orden
npm publish -w @gentek/method
npm publish -w @gentek/core
npm publish -w @gentek/cli

# 5. Verifica
npm view @gentek/cli
npm view @gentek/core
npm view @gentek/method
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
npm version 0.4.0 -w @gentek/method
npm version 0.4.0 -w @gentek/core
npm version 0.4.0 -w @gentek/cli
```

Y actualiza las referencias internas en `dependencies` de cada `package.json`.

## Verificación post-publicación

```bash
# Desde un directorio temporal
mkdir /tmp/gentek-smoke && cd /tmp/gentek-smoke
npx @gentek/cli init demo --provider claude-cli
cd demo
npx @gentek/cli status
```
