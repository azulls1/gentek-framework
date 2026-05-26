import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { analyzeCodebase, summarizeAnalysis } from '../src/analysis/codebase.js';

describe('analyzeCodebase', () => {
  let fixture: string;

  beforeAll(() => {
    fixture = mkdtempSync(resolve(tmpdir(), 'iagentek-analysis-'));
    // Create a fake node project with React + Express
    writeFileSync(
      resolve(fixture, 'package.json'),
      JSON.stringify({
        name: 'my-app',
        dependencies: { react: '^18.0.0', express: '^4.19.0' },
        devDependencies: { typescript: '^5.0.0' },
      })
    );
    writeFileSync(resolve(fixture, 'README.md'), '# My App\n\nA test fixture for IAgentek.');
    mkdirSync(resolve(fixture, 'src'));
    writeFileSync(resolve(fixture, 'src', 'index.ts'), 'export const x = 1;');
    writeFileSync(resolve(fixture, 'src', 'App.tsx'), 'export const App = () => null;');
    writeFileSync(resolve(fixture, 'src', 'server.js'), 'console.log("hi");');
    mkdirSync(resolve(fixture, 'test'));
    writeFileSync(resolve(fixture, 'test', 'app.test.ts'), 'test("x", () => {});');
  });

  afterAll(() => {
    rmSync(fixture, { recursive: true, force: true });
  });

  it('detects languages by extension', () => {
    const result = analyzeCodebase(fixture);
    const languages = result.languages.map((l) => l.extension);
    expect(languages).toContain('.ts');
    expect(languages).toContain('.tsx');
    expect(languages).toContain('.js');
  });

  it('detects node package manager and dependencies', () => {
    const result = analyzeCodebase(fixture);
    const node = result.packageManagers.find((p) => p.ecosystem === 'node');
    expect(node).toBeDefined();
    expect(node!.declaredDependencies).toEqual(
      expect.arrayContaining(['react', 'express', 'typescript'])
    );
  });

  it('detects python deps from pyproject.toml correctly (regression: TOML keys leaking)', () => {
    const pyFixture = mkdtempSync(resolve(tmpdir(), 'iagentek-py-'));
    writeFileSync(
      resolve(pyFixture, 'pyproject.toml'),
      `[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "myapp"
version = "0.1.0"
description = "Test"
requires-python = ">=3.9"
license = "MIT"
authors = [{ name = "Test" }]
dependencies = [
  "requests>=2.0",
  "click",
  "fastapi[all]>=0.100,<1.0",
]

[project.optional-dependencies]
dev = ["pytest>=7", "ruff"]
`
    );
    const result = analyzeCodebase(pyFixture);
    const py = result.packageManagers.find((p) => p.ecosystem === 'python');
    expect(py).toBeDefined();
    expect(py!.declaredDependencies).toEqual(
      expect.arrayContaining(['requests', 'click', 'fastapi', 'pytest', 'ruff'])
    );
    // Regression: TOML keys should NOT leak as dependencies
    expect(py!.declaredDependencies).not.toContain('build-backend');
    expect(py!.declaredDependencies).not.toContain('requires-python');
    expect(py!.declaredDependencies).not.toContain('license');
    expect(py!.declaredDependencies).not.toContain('description');
    rmSync(pyFixture, { recursive: true, force: true });
  });

  it('detects React and Express as frameworks', () => {
    const result = analyzeCodebase(fixture);
    expect(result.frameworks).toEqual(expect.arrayContaining(['React', 'Express']));
  });

  it('finds the README', () => {
    const result = analyzeCodebase(fixture);
    expect(result.hasReadme).toBe(true);
    expect(result.readmeExcerpt).toContain('My App');
  });

  it('counts total files', () => {
    const result = analyzeCodebase(fixture);
    expect(result.totalFiles).toBeGreaterThan(0);
    expect(result.totalSourceFiles).toBeGreaterThan(0);
  });

  it('summarizeAnalysis returns a non-empty string with key sections', () => {
    const result = analyzeCodebase(fixture);
    const summary = summarizeAnalysis(result);
    expect(summary).toContain('# Análisis del codebase');
    expect(summary).toContain('## Lenguajes detectados');
    expect(summary).toContain('## Package managers');
    expect(summary).toContain('## Frameworks');
  });

  it('ignores node_modules and .git', () => {
    const dirty = mkdtempSync(resolve(tmpdir(), 'iagentek-dirty-'));
    mkdirSync(resolve(dirty, 'node_modules'));
    writeFileSync(resolve(dirty, 'node_modules', 'huge.js'), 'x'.repeat(1000));
    mkdirSync(resolve(dirty, '.git'));
    writeFileSync(resolve(dirty, '.git', 'config'), '[core]');
    writeFileSync(resolve(dirty, 'app.ts'), 'export {};');

    const result = analyzeCodebase(dirty);
    // node_modules and .git should not appear in topLevelDirs
    expect(result.topLevelDirs).not.toContain('node_modules');
    expect(result.topLevelDirs).not.toContain('.git');

    rmSync(dirty, { recursive: true, force: true });
  });
});
