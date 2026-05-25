// Copy the root LICENSE into each publishable package so npm includes it in the tarball.
// Run automatically before publish (see package.json prepublishOnly).
import { copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');
const rootLicense = resolve(repoRoot, 'LICENSE');

if (!existsSync(rootLicense)) {
  console.error('[sync-license] LICENSE not found at repo root');
  process.exit(1);
}

const packagesDir = resolve(repoRoot, 'packages');
const packages = readdirSync(packagesDir).filter((entry) => {
  const path = resolve(packagesDir, entry);
  return statSync(path).isDirectory() && existsSync(resolve(path, 'package.json'));
});

for (const pkg of packages) {
  const dest = resolve(packagesDir, pkg, 'LICENSE');
  copyFileSync(rootLicense, dest);
  console.log(`[sync-license] LICENSE -> packages/${pkg}/LICENSE`);
}
