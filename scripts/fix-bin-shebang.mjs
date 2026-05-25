// Ensure the compiled iagentek.js entry has a shebang and is executable.
import { chmodSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');

const binPath = resolve(repoRoot, 'packages', 'cli', 'dist', 'bin', 'iagentek.js');
if (!existsSync(binPath)) {
  console.log('[fix-bin-shebang] dist/bin/iagentek.js no existe — skip');
  process.exit(0);
}
const content = readFileSync(binPath, 'utf-8');
if (!content.startsWith('#!')) {
  writeFileSync(binPath, `#!/usr/bin/env node\n${content}`, 'utf-8');
  console.log('[fix-bin-shebang] shebang añadido');
}
try {
  chmodSync(binPath, 0o755);
} catch {
  // Windows ignora chmod, no es un error
}
console.log('[fix-bin-shebang] listo');
