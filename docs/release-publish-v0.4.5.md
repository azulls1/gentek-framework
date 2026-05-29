# Publish Procedure — v0.4.5

**Do not execute these commands automatically.** Publishing is destructive (you cannot un-publish from npm after 72 hours) and requires `npm login` against your `samael-azull1` account with publish rights to the `@iagentek` org.

## Pre-flight checklist

- [ ] `npm test` from repo root → all 117+ tests pass on this machine.
- [ ] `npm run build` from repo root → clean, no TypeScript errors.
- [ ] `docs/release-smoke-v0.4.5.md` executed manually with at least Scenarios A, B, and C verified.
- [ ] `CHANGELOG.md` has the `## [0.4.5] — <date>` section filled in.
- [ ] All three `package.json` files show `"version": "0.4.5"`.
- [ ] Internal dependency pins are updated: `cli` depends on `core@0.4.5` and `method@0.4.5`.
- [ ] No uncommitted secrets in `git status` (especially `.env`, anything in `.iagentek/` if you smoke-tested in the repo).

## Verify auth

```bash
npm whoami
# Expected: samael-azull1

npm access list packages --json | grep @iagentek
# Expected: @iagentek/cli, @iagentek/core, @iagentek/method listed
```

## Commit + tag

```bash
git add packages/method/package.json packages/core/package.json packages/cli/package.json \
        package-lock.json CHANGELOG.md \
        packages/core/src/state/manager.ts \
        packages/core/src/checkpoints/manager.ts \
        packages/core/src/flow/loader.ts \
        packages/core/src/orchestrator/index.ts \
        packages/core/src/config/loader.ts \
        packages/core/test/state.atomic.test.ts \
        packages/core/test/orchestrator.reconcile.test.ts \
        packages/core/test/transcripts.reuse.test.ts \
        docs/release-smoke-v0.4.5.md \
        docs/release-publish-v0.4.5.md \
        .iagentek/

git commit -m "v0.4.5: Atomic state writes + crash-recovery reconcile + transcript reuse

- StateManager.save() now writes to tmp + fsync + rename with retry; orphan
  tmps are cleaned automatically.
- Orchestrator reconciles approve↔completed gap at start of every run;
  unified save eliminates the gap in new cycles.
- Transcript reuse <24h avoids re-spending LLM tokens on crash-recovery.
- Flow loader rejects duplicate checkpoint.id across phases.
- CheckpointManager.run() now returns { decision, notes } (internal API).
- 22 new tests, total suite: 117 passing.

Foundation for v0.4.6 (CONTEXT/HISTORY) and v0.5.0 (scribe agent)."

git tag v0.4.5
```

## Publish — in dependency order

```bash
# 1. method first (no internal deps).
npm publish --workspace=@iagentek/method --access=public

# 2. core next (depends on method).
npm publish --workspace=@iagentek/core --access=public

# 3. cli last (depends on core + method).
npm publish --workspace=@iagentek/cli --access=public
```

## Verify

```bash
# Wait ~30 seconds for the registry to propagate, then:
npm view @iagentek/method version    # expected: 0.4.5
npm view @iagentek/core version      # expected: 0.4.5
npm view @iagentek/cli version       # expected: 0.4.5

# Sanity check from a clean shell (no local linking):
npx @iagentek/cli@0.4.5 --version    # expected: 0.4.5
```

## Push tag + GitHub release

```bash
git push origin main
git push origin v0.4.5

gh release create v0.4.5 \
  --title "v0.4.5: Crash-recovery foundation" \
  --notes-file <(awk '/^## \[0.4.5\]/,/^## \[0.4.4\]/' CHANGELOG.md | sed '$d')
```

## If something goes wrong

- **Failed `npm publish` mid-release** (one package published, others failed): the published one CANNOT be re-uploaded with the same version. Bump to 0.4.6 immediately and re-publish all three. Document in CHANGELOG.
- **Bug found after publish, within 72 hours**: `npm unpublish @iagentek/<pkg>@0.4.5 --force`. Bump to 0.4.6 with the fix.
- **Bug found after 72 hours**: cannot unpublish. Ship a 0.4.5.1 patch or jump to 0.4.6 with the fix and CHANGELOG note pointing users away from 0.4.5.

---

Generated as part of `STORY-007` / `tasks/memory-bugfixes.md#task-16`.
