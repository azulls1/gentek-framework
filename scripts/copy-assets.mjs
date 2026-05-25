// Copy /assets folder so the published package keeps the same relative path
// the runtime expects (resolves ../../assets from dist/src/index.js).
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');

const packages = ['method'];

for (const pkg of packages) {
  const src = resolve(repoRoot, 'packages', pkg, 'assets');
  if (!existsSync(src)) {
    console.log(`[copy-assets] no assets/ in ${pkg}, skipping`);
    continue;
  }
  console.log(`[copy-assets] assets/ already at package root for ${pkg} — nothing to copy`);
}
