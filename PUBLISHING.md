# Publishing to npm

Guide to publish the 3 packages of the IAgentek monorepo (`@iagentek/method`, `@iagentek/core`, `@iagentek/cli`) to the public npm registry.

## Prerequisites

1. **npm account** with access to the `@iagentek` scope. If the scope doesn't exist, create it from [npmjs.com/org/create](https://www.npmjs.com/org/create) or publish the first version as the user — npm will create the scope automatically.
2. **Publish token** (`npm token create`) or `npm login` with 2FA enabled.
3. **Clean build** of the monorepo: `npm run build`.

## Mandatory publish order

Packages have internal dependencies. Publish in this order:

```bash
npm publish -w @iagentek/method     # 1st — depends on nothing
npm publish -w @iagentek/core       # 2nd — depends on @iagentek/method
npm publish -w @iagentek/cli        # 3rd — depends on @iagentek/core + @iagentek/method
```

> ⚠️ If an internal version points to `"0.3.1"` and you haven't published that version of the dependency yet, npm will fail. Bump versions in order.

## Complete steps

```bash
# 1. Clean and build
npm run clean
npm install
npm run build

# 2. Login (if you don't have a saved token)
npm login

# 3. Verify what will be published (dry-run)
npm publish --dry-run -w @iagentek/method
npm publish --dry-run -w @iagentek/core
npm publish --dry-run -w @iagentek/cli

# 4. Publish in order
npm publish -w @iagentek/method
npm publish -w @iagentek/core
npm publish -w @iagentek/cli

# 5. Verify
npm view @iagentek/cli
npm view @iagentek/core
npm view @iagentek/method
```

## Release tag on GitHub

```bash
git tag -a v0.3.1 -m "Release 0.3.1 — version fix"
git push origin v0.3.1
```

Then from the GitHub UI create a Release pointing to the tag with a changelog.

## Bumping versions

To raise all to a new version simultaneously:

```bash
npm version 0.4.0 -w @iagentek/method
npm version 0.4.0 -w @iagentek/core
npm version 0.4.0 -w @iagentek/cli
```

And update the internal references in `dependencies` of each `package.json`.

## Post-publication verification

```bash
# From a temp directory
mkdir /tmp/iagentek-smoke && cd /tmp/iagentek-smoke
npx @iagentek/cli init demo --provider claude-cli
cd demo
npx @iagentek/cli status
```
