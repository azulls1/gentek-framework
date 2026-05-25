import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, relative, extname } from 'node:path';

export interface CodebaseAnalysis {
  rootPath: string;
  rootFiles: string[];
  topLevelDirs: string[];
  languages: LanguageStats[];
  packageManagers: PackageManagerInfo[];
  frameworks: string[];
  hasReadme: boolean;
  readmeExcerpt: string | null;
  totalFiles: number;
  totalSourceFiles: number;
}

export interface LanguageStats {
  language: string;
  files: number;
  extension: string;
}

export interface PackageManagerInfo {
  ecosystem: 'node' | 'python' | 'go' | 'rust' | 'ruby' | 'java' | 'php' | 'dotnet';
  manifestFile: string;
  declaredDependencies: string[];
}

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript (React)',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript (React)',
  '.mjs': 'JavaScript (ESM)',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.cs': 'C#',
  '.swift': 'Swift',
  '.c': 'C',
  '.cpp': 'C++',
  '.h': 'C/C++ header',
  '.dart': 'Dart',
};

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.cache',
  'coverage',
  '__pycache__',
  '.venv',
  'venv',
  'env',
  'target',
  'vendor',
  '.iagentek',
  '.idea',
  '.vscode',
]);

export function analyzeCodebase(rootPath: string, maxDepth = 8): CodebaseAnalysis {
  const abs = resolve(rootPath);
  const rootFiles: string[] = [];
  const topLevelDirs: string[] = [];
  const extensionCounts = new Map<string, number>();
  let totalFiles = 0;
  let totalSourceFiles = 0;

  for (const entry of readdirSync(abs)) {
    const path = resolve(abs, entry);
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.has(entry) && !entry.startsWith('.')) {
        topLevelDirs.push(entry);
      }
    } else if (stat.isFile()) {
      rootFiles.push(entry);
    }
  }

  walk(abs, abs, 0, maxDepth, extensionCounts, (file) => {
    totalFiles++;
    if (file.ext in LANGUAGE_EXTENSIONS) totalSourceFiles++;
  });

  const languages: LanguageStats[] = [...extensionCounts.entries()]
    .filter(([ext]) => ext in LANGUAGE_EXTENSIONS)
    .map(([ext, count]) => ({
      language: LANGUAGE_EXTENSIONS[ext],
      files: count,
      extension: ext,
    }))
    .sort((a, b) => b.files - a.files);

  const packageManagers = detectPackageManagers(abs);
  const frameworks = detectFrameworks(abs, packageManagers);

  const readmePath = ['README.md', 'README.rst', 'README.txt', 'README']
    .map((n) => resolve(abs, n))
    .find((p) => existsSync(p));
  const hasReadme = Boolean(readmePath);
  const readmeExcerpt = readmePath
    ? readFileSync(readmePath, 'utf-8').slice(0, 1200)
    : null;

  return {
    rootPath: abs,
    rootFiles,
    topLevelDirs,
    languages,
    packageManagers,
    frameworks,
    hasReadme,
    readmeExcerpt,
    totalFiles,
    totalSourceFiles,
  };
}

function walk(
  base: string,
  current: string,
  depth: number,
  maxDepth: number,
  extensionCounts: Map<string, number>,
  onFile: (info: { ext: string; rel: string }) => void
): void {
  if (depth > maxDepth) return;
  let entries: string[];
  try {
    entries = readdirSync(current);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry)) continue;
    const path = resolve(current, entry);
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      walk(base, path, depth + 1, maxDepth, extensionCounts, onFile);
    } else if (stat.isFile()) {
      const ext = extname(entry).toLowerCase();
      extensionCounts.set(ext, (extensionCounts.get(ext) ?? 0) + 1);
      onFile({ ext, rel: relative(base, path) });
    }
  }
}

function detectPackageManagers(rootPath: string): PackageManagerInfo[] {
  const found: PackageManagerInfo[] = [];

  const tryFile = (
    file: string,
    ecosystem: PackageManagerInfo['ecosystem'],
    parser: (content: string) => string[]
  ) => {
    const path = resolve(rootPath, file);
    if (!existsSync(path)) return;
    try {
      const deps = parser(readFileSync(path, 'utf-8'));
      found.push({ ecosystem, manifestFile: file, declaredDependencies: deps });
    } catch {
      // ignore parse errors
    }
  };

  tryFile('package.json', 'node', (c) => {
    const json = JSON.parse(c);
    return [
      ...Object.keys(json.dependencies ?? {}),
      ...Object.keys(json.devDependencies ?? {}),
    ];
  });
  tryFile('requirements.txt', 'python', (c) =>
    c
      .split('\n')
      .map((l) => l.split(/[=<>~]/)[0].trim())
      .filter(Boolean)
  );
  tryFile('pyproject.toml', 'python', (c) => {
    const matches = c.matchAll(/^\s*["']?([a-zA-Z0-9_-]+)["']?\s*=/gm);
    return [...matches].map((m) => m[1]);
  });
  tryFile('go.mod', 'go', (c) => {
    const matches = c.matchAll(/^require\s+([^\s]+)/gm);
    return [...matches].map((m) => m[1]);
  });
  tryFile('Cargo.toml', 'rust', (c) => {
    const section = c.split('[dependencies]')[1]?.split('[')[0] ?? '';
    const matches = section.matchAll(/^([a-zA-Z0-9_-]+)\s*=/gm);
    return [...matches].map((m) => m[1]);
  });
  tryFile('Gemfile', 'ruby', (c) => {
    const matches = c.matchAll(/^gem\s+["']([^"']+)["']/gm);
    return [...matches].map((m) => m[1]);
  });
  tryFile('pom.xml', 'java', () => []);
  tryFile('composer.json', 'php', (c) => {
    const json = JSON.parse(c);
    return [
      ...Object.keys(json.require ?? {}),
      ...Object.keys(json['require-dev'] ?? {}),
    ];
  });

  return found;
}

function detectFrameworks(rootPath: string, pms: PackageManagerInfo[]): string[] {
  const deps = new Set(pms.flatMap((p) => p.declaredDependencies));
  const found: string[] = [];

  const checks: Array<{ name: string; signals: string[] }> = [
    { name: 'React', signals: ['react'] },
    { name: 'Next.js', signals: ['next'] },
    { name: 'Vue', signals: ['vue'] },
    { name: 'Nuxt', signals: ['nuxt'] },
    { name: 'Svelte', signals: ['svelte', '@sveltejs/kit'] },
    { name: 'Angular', signals: ['@angular/core'] },
    { name: 'Express', signals: ['express'] },
    { name: 'Fastify', signals: ['fastify'] },
    { name: 'NestJS', signals: ['@nestjs/core'] },
    { name: 'Hono', signals: ['hono'] },
    { name: 'tRPC', signals: ['@trpc/server'] },
    { name: 'Django', signals: ['Django', 'django'] },
    { name: 'FastAPI', signals: ['fastapi'] },
    { name: 'Flask', signals: ['Flask', 'flask'] },
    { name: 'Rails', signals: ['rails'] },
    { name: 'Spring Boot', signals: ['spring-boot-starter'] },
    { name: 'Vite', signals: ['vite'] },
    { name: 'Tailwind CSS', signals: ['tailwindcss'] },
    { name: 'Prisma', signals: ['prisma', '@prisma/client'] },
    { name: 'Drizzle ORM', signals: ['drizzle-orm'] },
    { name: 'TypeORM', signals: ['typeorm'] },
  ];

  for (const c of checks) {
    if (c.signals.some((s) => deps.has(s))) found.push(c.name);
  }

  // Filesystem-based detection
  if (existsSync(resolve(rootPath, 'Dockerfile'))) found.push('Docker');
  if (existsSync(resolve(rootPath, 'docker-compose.yml'))) found.push('Docker Compose');
  if (existsSync(resolve(rootPath, '.github', 'workflows'))) found.push('GitHub Actions');

  return found;
}

export function summarizeAnalysis(a: CodebaseAnalysis): string {
  const lines: string[] = [];
  lines.push(`# Análisis del codebase`);
  lines.push(``);
  lines.push(`**Path:** ${a.rootPath}`);
  lines.push(`**Total de archivos:** ${a.totalFiles} (de los cuales ${a.totalSourceFiles} son fuente)`);
  lines.push(``);
  lines.push(`## Lenguajes detectados`);
  if (a.languages.length === 0) {
    lines.push(`(ninguno reconocido)`);
  } else {
    for (const l of a.languages.slice(0, 10)) {
      lines.push(`- ${l.language} (${l.extension}): ${l.files} archivos`);
    }
  }
  lines.push(``);
  lines.push(`## Package managers / ecosistemas`);
  if (a.packageManagers.length === 0) {
    lines.push(`(ninguno detectado)`);
  } else {
    for (const pm of a.packageManagers) {
      lines.push(`- ${pm.ecosystem} (${pm.manifestFile}) — ${pm.declaredDependencies.length} deps declaradas`);
      if (pm.declaredDependencies.length > 0) {
        const sample = pm.declaredDependencies.slice(0, 15).join(', ');
        const more = pm.declaredDependencies.length > 15 ? `, +${pm.declaredDependencies.length - 15} más` : '';
        lines.push(`  - top deps: ${sample}${more}`);
      }
    }
  }
  lines.push(``);
  lines.push(`## Frameworks detectados`);
  lines.push(a.frameworks.length > 0 ? `- ${a.frameworks.join('\n- ')}` : `(ninguno reconocido)`);
  lines.push(``);
  lines.push(`## Estructura top-level`);
  lines.push(`Archivos raíz: ${a.rootFiles.join(', ') || '(ninguno)'}`);
  lines.push(`Directorios top: ${a.topLevelDirs.join(', ') || '(ninguno)'}`);
  lines.push(``);
  if (a.hasReadme && a.readmeExcerpt) {
    lines.push(`## README (extracto)`);
    lines.push('```');
    lines.push(a.readmeExcerpt);
    lines.push('```');
  } else {
    lines.push(`## README`);
    lines.push(`No se encontró README en la raíz.`);
  }
  return lines.join('\n');
}
