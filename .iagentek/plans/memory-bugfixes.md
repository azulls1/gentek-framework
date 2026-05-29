# Technical Plan: Memory System — Release 1 (v0.4.5 bug fixes)

**Implements spec:** `specs/memory-system.md` (Release 1 section)

## Approach

Three independent fixes, all in `@iagentek/core`. None are user-visible features; they are foundational invariants the rest of the memory system depends on. Ship as v0.4.5 patch — additive, backwards-compatible at runtime, no migration step.

1. **Atomic state writes** — replace `writeFileSync` with `write-temp + fsync + rename + retry + stale-tmp cleanup`. Cross-platform safe (Windows + POSIX).
2. **Reconcile the approve↔markCompleted gap** — defense-in-depth: (a) detect inconsistent state at the start of every `run()` and auto-fix it (Option B from analysis), (b) collapse the two writes into a single unified save inside the orchestrator (Option C). Both together.
3. **Transcript reuse <24h** — if a phase transcript exists from a recent crash, reuse it instead of re-calling the LLM. Logged, not prompted.

## Affected components

- **`packages/core/src/state/manager.ts`** — `save()` becomes atomic; `load()` gains tmp cleanup. Public API unchanged.
- **`packages/core/src/checkpoints/manager.ts`** — `run()` return type goes from `CheckpointDecision` to `{ decision: CheckpointDecision; notes?: string }`. Notes already exist in handler return; just plumbed up.
- **`packages/core/src/orchestrator/index.ts`** — adds `reconcileState()` call at start of `run()`; collapses checkpoint approval into a unified save (Option C); adds transcript-reuse path inside `runPhase()`.
- **`packages/core/src/flow/loader.ts`** — adds duplicate-`checkpoint.id` validation.

## Data model (changes)

No on-disk schema changes. `state.json` keeps its current shape: `{ projectName, flow, currentPhase, completedPhases, checkpoints, createdAt, updatedAt }`. New behavior is purely in the write path.

The orphan tmp pattern is new and follows: `state.json.<pid>.<6-hex>.tmp`. Cleaned up on next `load()` if older than 60s.

## Contracts / API

```ts
// state/manager.ts — internal change, signature unchanged
save(state: Partial<IAgentekState>): IAgentekState
load(): IAgentekState                // now cleans stale tmps first

// checkpoints/manager.ts — BREAKING-LITE (caller is orchestrator, only known consumer)
run(
  id: string,
  phaseId: string,
  prompt: string,
  summary: string,
  outputs?: string[]
): Promise<{ decision: CheckpointDecision; notes?: string }>
// before: Promise<CheckpointDecision>

// orchestrator/index.ts — internal additions, no new public exports
private async reconcileState(state: IAgentekState, flow: FlowDefinition): Promise<void>
// inside runPhase, no new symbol, just an early-return path

// flow/loader.ts — internal additions
function validateUniqueCheckpointIds(flow: FlowDefinition): void  // throws on dupes
```

## Pseudocode for the key logic

### 1. Atomic `save()`

```
save(partial):
  current = exists() ? load() : empty()
  merged  = { ...current, ...partial, updatedAt: now() }

  json    = JSON.stringify(merged, null, 2) + '\n'
  dir     = dirname(this.path)
  tmpPath = `${this.path}.${process.pid}.${randomHex(6)}.tmp`

  mkdirSync(dir, { recursive: true })

  fd = openSync(tmpPath, 'wx')                  // fail if exists (PID+hex makes collision impossible)
  try:
    writeSync(fd, json, 0, 'utf-8')
    fsyncSync(fd)
  finally:
    closeSync(fd)

  renameWithRetry(tmpPath, this.path, attempts=5, delays=[10,30,80,200,500])
  // POSIX: fsync parent dir for durability
  if (process.platform !== 'win32'):
    dfd = openSync(dir, 'r'); try { fsyncSync(dfd) } finally { closeSync(dfd) }

  this.state = merged
  return merged


renameWithRetry(src, dst, attempts, delays):
  for i in 0..attempts:
    try:
      renameSync(src, dst)
      return
    catch e:
      if e.code in {EBUSY, EPERM, EACCES} and i < attempts - 1:
        sleepSync(delays[i] + random(0..20))
        continue
      try { unlinkSync(src) } catch {}    // clean up our tmp
      throw e
```

### 2. Stale tmp cleanup on `load()`

```
load():
  cleanupStaleTmps()
  // ...existing load logic

cleanupStaleTmps():
  dir = dirname(this.path)
  if !existsSync(dir): return
  pattern = /^state\.json\.\d+\.[0-9a-f]{6}\.tmp$/
  for f in readdirSync(dir):
    if !pattern.test(f): continue
    full = join(dir, f)
    try:
      age = Date.now() - statSync(full).mtimeMs
      if age > 60_000:
        unlinkSync(full)
    catch {}     // best-effort; cleanup never throws
```

### 3. Reconcile (Option B) at orchestrator start

```
Orchestrator.run():
  state = this.state.exists() ? this.state.load() : this.state.init(...)
  reconcileState(state)
  // ...existing loop

reconcileState(state):
  for phase in flow.phases:
    if !phase.checkpoint: continue
    cpId = phase.checkpoint.id
    hasApproved   = state.checkpoints.some(c => c.id === cpId)
    isCompleted   = state.completedPhases.includes(phase.id)
    if hasApproved && !isCompleted:
      logger.dim(`  ⤴  Reconciling '${phase.name}': approved but not marked complete.`)
      this.state.markPhaseCompleted(phase.id)
```

### 4. Unified save on approval (Option C)

Today in `Orchestrator.run()`:
```
const decision = await this.checkpoints.run(...)  // calls state.recordCheckpoint internally
if (decision !== 'approve') return
this.state.markPhaseCompleted(phase.id)           // second separate save
```

After:
```
const { decision, notes } = await this.checkpoints.run(...)  // returns object now
if (decision !== 'approve') return
// CheckpointManager no longer calls recordCheckpoint — orchestrator does both in ONE save
this.state.save({
  checkpoints: [...state.checkpoints, { id: cpId, approvedAt: now(), notes }],
  completedPhases: [...state.completedPhases, phase.id],
  currentPhase: null,
})
```

`CheckpointManager.run()` becomes pure: ask handler, return `{ decision, notes }`. It no longer mutates state. The orchestrator owns the transactional write.

### 5. Transcript reuse <24h

```
runPhase(phase):
  if !phase.agent.startsWith('__'):     // skip builtins; they're cheap
    transcriptPath = join(projectDir, '.iagentek', '.transcripts', `${phase.id}.md`)
    if existsSync(transcriptPath):
      stat = statSync(transcriptPath)
      age  = Date.now() - stat.mtimeMs
      if age < 24*3600_000 && stat.size > 200:
        logger.dim(`  ♻  Reusing transcript from ${humanizeAge(age)} for '${phase.name}'.`)
        return readFileSync(transcriptPath, 'utf-8')
  // ...existing LLM call path
```

### 6. Flow validation

```
loadFlowDefinition(name, lang):
  raw  = loadFlow(name, lang)
  flow = yaml.load(raw)
  validateUniqueCheckpointIds(flow)
  return flow

validateUniqueCheckpointIds(flow):
  seen = new Set()
  for p in flow.phases:
    if !p.checkpoint: continue
    if seen.has(p.checkpoint.id):
      throw new Error(`Flow '${flow.name}' has duplicate checkpoint.id '${p.checkpoint.id}' (phase '${p.id}')`)
    seen.add(p.checkpoint.id)
```

## Required tests

### Unit — `state.atomic.test.ts` (10 cases)
1. Happy path: save → load round-trips correctly.
2. Crash simulated mid-write (monkey-patch `writeSync` to throw after N bytes) → previous `state.json` intact, no orphan `.tmp` after cleanup.
3. Rename retry: first `renameSync` throws `EBUSY`, second succeeds → save completes; one retry observed.
4. Readonly file: `state.json` set readonly → save throws clear error, original intact.
5. ENOSPC simulated → previous `state.json` intact, `.tmp` removed.
6. Concurrent saves (two `Promise.all` saves) → no collision, last-writer-wins, both finish without error.
7. Stale tmp cleanup: pre-create `state.json.99999.deadbe.tmp` with mtime 2h ago → `load()` removes it.
8. Recent tmp NOT cleaned: pre-create same tmp with mtime 10s ago → preserved.
9. Windows path with spaces → save+load works.
10. Unicode/UTF-8 with bidi marks in `notes` field → round-trip preserves bytes.

### Unit — `checkpoint-manager.test.ts` (additions, ~3 cases)
1. `run()` returns `{ decision, notes }` shape — `notes` propagated from handler.
2. `run()` no longer mutates `state.checkpoints` (orchestrator owns the write).
3. `run()` with mode `skip` or `auto` still returns `{ decision: 'approve' }` (no handler call).

### Integration — `orchestrator.reconcile.test.ts` (5 cases)
1. State with `checkpoints: [{id:'cp1'}]` but `completedPhases: []` (matching `cp1` to a phase) → reconcile marks completed, no LLM call.
2. State with extra checkpoint for an unrelated phase → next phase still runs normally.
3. Full crash recovery flow: simulate crash post-approve → resume completes the cycle without re-calling provider on the affected phase.
4. Two phases with same checkpoint.id in flow YAML → flow loader rejects at `loadFlowDefinition`.
5. Cycle with mode `fully-autonomous` + reconcile: no human prompt during recovery.

### Integration — `transcripts.reuse.test.ts` (4 cases)
1. Transcript <24h old, size >200 bytes → reused, `provider.complete` NOT called.
2. Transcript exists but >24h → ignored, new LLM call made.
3. Transcript exists but size ≤200 bytes (placeholder) → ignored.
4. Builtin agent `__codebase__` → never reuses, always runs fresh.

### E2E (one full smoke)
1. Create project → run greenfield to story-done → kill process mid-runPhase → run `resume` → verify zero LLM calls for already-transcribed phases AND clean completion of remaining phases.

## Technical risks

- **OneDrive on-demand `.iagentek/`** → first save slow / `EBUSY` likely. **Mitigation:** retry covers most cases; emit warning at `init` if `cwd` includes `OneDrive`. Document in `docs/troubleshooting.md` (new section).
- **Windows antivirus locks** → `MoveFileExW` returns `EPERM`/`EACCES` transiently. **Mitigation:** retry with backoff up to ~820ms total covers ≥99% of observed lock durations.
- **`renameSync` cross-volume** → `EXDEV` on POSIX. **Mitigation:** tmp is built in same `dirname` as final, so guaranteed same FS. Document the assumption.
- **Breaking change in `CheckpointManager.run()` return type** → external consumers using `@iagentek/core` directly break. **Mitigation:** zero known external consumers today (verified by npm dependents); document in CHANGELOG; v0.4.5 patch bump accepted because the only internal caller (Orchestrator) is updated in the same release. The semver-strict alternative is v0.5.0 — rejected because we want v0.5.0 reserved for the scribe.
- **Reconcile false positives if future flows add mid-phase checkpoints sharing the phase's `checkpoint.id`** → marked complete prematurely. **Mitigation:** flow loader rejects duplicate `checkpoint.id`s across the flow; reconcile only operates on the canonical `phase.checkpoint.id`. Documented in `flow/loader.ts` comments.
- **`fsyncSync` not supported on some network FS** → returns `EINVAL`. **Mitigation:** wrap in silent try/catch; rename is still the committer.

## Complexity estimate

- **Size:** M
- **Rationale:** ~300 LoC added across 4 files, ~30 LoC removed (current naive `save`). 22 new test cases. No new external dependencies. No new public API surface other than the `CheckpointManager.run()` signature change. The main complexity is cross-platform write-atomicity testing — Windows retry behavior is the only nontrivial code path. Estimated ~3 dev days including tests, code review, and CHANGELOG.

---

**Generated by:** Architect (claude-opus-4-7 via consilium 2026-05-29) | **Atomic tasks at:** `tasks/memory-bugfixes.md`
