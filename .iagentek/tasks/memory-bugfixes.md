# Tasks: Memory System — Release 1 (v0.4.5 bug fixes)

> Each task is atomic (1-4h), has a single verifiable deliverable, and can be executed without waiting on others unless dependencies are explicit.

| #  | Task | Size | Depends on | Story | Status |
|----|------|------|------------|-------|--------|
| 1  | Implement `atomicWriteJson(path, json)` helper | S | — | STORY-001 | pending |
| 2  | Implement `renameWithRetry(src, dst)` helper | S | 1 | STORY-001 | pending |
| 3  | Refactor `StateManager.save()` to use the atomic helpers | M | 1, 2 | STORY-001 | pending |
| 4  | Implement `cleanupStaleTmps()` and call from `load()` | S | — | STORY-002 | pending |
| 5  | Add `reconcileState(state)` to `Orchestrator.run()` | S | — | STORY-003 | pending |
| 6  | Change `CheckpointManager.run()` to return `{ decision, notes }` and remove internal `recordCheckpoint` call | M | — | STORY-005 | pending |
| 7  | Update orchestrator to do unified `state.save({ checkpoints, completedPhases })` post-approve | M | 3, 6 | STORY-004 | pending |
| 8  | Update all internal callers of `CheckpointManager.run()` and CHANGELOG note | S | 6 | STORY-005 | pending |
| 9  | Implement `validateUniqueCheckpointIds(flow)` and call from `loadFlowDefinition` | S | — | STORY-006 | pending |
| 10 | Add transcript-reuse path in `runPhase()` with config knob | M | — | STORY-007 | pending |
| 11 | Write unit tests `state.atomic.test.ts` (10 cases) | M | 3 | STORY-001 | pending |
| 12 | Write integration tests `orchestrator.reconcile.test.ts` (5 cases) | M | 5, 7 | STORY-003, STORY-004 | pending |
| 13 | Write unit tests for `transcripts.reuse.test.ts` (4 cases) | S | 10 | STORY-007 | pending |
| 14 | Bump versions to 0.4.5 in all 3 packages + CHANGELOG entry | S | all above | release | pending |
| 15 | Smoke E2E: greenfield init → cycle → simulated crash → resume → verify zero re-spend | M | all above | acceptance | pending |
| 16 | `npm publish` for cli + core + method | S | 14, 15 | release | pending |

**Size key:** S = 1h, M = 2-4h, L = ≥4h (not allowed at task level — break further).

---

## Detail per task

### Task 1: Implement `atomicWriteJson(path, json)` helper
- **File:** `packages/core/src/state/manager.ts` (private function, not exported initially)
- **Deliverable:** Function that writes a JSON string to a `.tmp` file (`<path>.<pid>.<6-hex>.tmp`), opens with `'wx'`, `fsync`s, closes. Returns the tmp path. Does NOT rename.
- **Verification:** Unit test: call helper, check tmp file exists with expected content. Calling twice in succession creates two distinct tmps (different hex). Force `openSync` to throw → no partial tmp.

### Task 2: Implement `renameWithRetry(src, dst)` helper
- **File:** `packages/core/src/state/manager.ts` (private function)
- **Deliverable:** Synchronous function that calls `renameSync(src, dst)` with up to 5 attempts, backoff `[10, 30, 80, 200, 500] ms` + 0-20ms jitter, only retrying on `EBUSY|EPERM|EACCES`. On final failure, `unlinkSync(src)` (silent on error) and throws.
- **Verification:** Unit test: mock `renameSync` to throw `EBUSY` 2 times then succeed → succeeds with 2 retries observed. Mock to always throw → throws after 5 attempts, tmp is unlinked. Other error codes (`EISDIR`) → no retry, throws immediately.

### Task 3: Refactor `StateManager.save()` to use the atomic helpers
- **File:** `packages/core/src/state/manager.ts`
- **Deliverable:** `save()` now does: build merged state, `atomicWriteJson` → `renameWithRetry`, then on POSIX `fsync` parent dir (silent on `EINVAL`). Public signature unchanged.
- **Verification:** All preexisting `state.json` tests still pass. New tests in Task 11 cover atomic behavior. Manual: `kill -9` mid-write (via `--inspect-brk` + breakpoint) → state.json unaffected.

### Task 4: Implement `cleanupStaleTmps()` and call from `load()`
- **File:** `packages/core/src/state/manager.ts`
- **Deliverable:** Private function scans `dirname(this.path)` for files matching `^state\.json\.\d+\.[0-9a-f]{6}\.tmp$`, checks mtime, unlinks if >60s old. All errors silenced. Called as the FIRST line of `load()`.
- **Verification:** Unit test: pre-create old + new tmp files → load() removes only the old one. Test cleanup never throws even if directory is unreadable.

### Task 5: Add `reconcileState(state)` to `Orchestrator.run()`
- **File:** `packages/core/src/orchestrator/index.ts`
- **Deliverable:** Private method `reconcileState(state)` that iterates flow phases with checkpoints, checks the (approved-but-not-completed) condition, calls `state.markPhaseCompleted(phase.id)` and logs. Called once at the start of `run()`, right after `state = this.state.exists() ? load() : init()`.
- **Verification:** Unit test: state with cp1 approved + phase1 not completed → reconcile marks phase1 complete + 1 log line. State already consistent → no log, no save. Multiple stale phases → all reconciled.

### Task 6: Change `CheckpointManager.run()` to return `{ decision, notes }` and remove internal recordCheckpoint call
- **File:** `packages/core/src/checkpoints/manager.ts`
- **Deliverable:** Signature change to `Promise<{ decision: CheckpointDecision; notes?: string }>`. Body no longer calls `this.state.recordCheckpoint`. `notes` is filled from the handler's `notes` (or undefined for `skip`/`auto`).
- **Verification:** Unit test: `run()` with handler returning `{ decision: 'approve', notes: 'foo' }` → returns `{ decision: 'approve', notes: 'foo' }`. `skip` mode → returns `{ decision: 'approve' }` (no notes). State is NOT mutated by `run()` (grep for `recordCheckpoint` in checkpoint manager → zero hits).

### Task 7: Update orchestrator to do unified state.save({ checkpoints, completedPhases }) post-approve
- **File:** `packages/core/src/orchestrator/index.ts`
- **Deliverable:** After `const { decision, notes } = await this.checkpoints.run(...)`, on `decision === 'approve'`, do ONE `state.save({ checkpoints: [...current.checkpoints, newCheckpoint], completedPhases: [...current.completedPhases, phase.id], currentPhase: null })`. Reject path: just return (no save needed, state unchanged).
- **Verification:** Integration test (5 cases) in Task 12. Grep: zero call sites of `markPhaseCompleted` remain in orchestrator. The original `recordCheckpoint` + `markPhaseCompleted` two-step pattern is replaced everywhere by the unified save.

### Task 8: Update all internal callers + CHANGELOG note
- **Files:** Wherever `checkpoints.run(...)` is called (currently just orchestrator) + `CHANGELOG.md`.
- **Deliverable:** Destructure `{ decision, notes }` at every call site. Add CHANGELOG entry under v0.4.5 noting the breaking change for external `@iagentek/core` consumers.
- **Verification:** TypeScript compiles cleanly. CHANGELOG lints (markdown). `git grep "await this.checkpoints.run"` shows only destructured-assignment patterns.

### Task 9: Implement validateUniqueCheckpointIds(flow) and call from loadFlowDefinition
- **File:** `packages/core/src/flow/loader.ts`
- **Deliverable:** New function `validateUniqueCheckpointIds(flow)` throws with descriptive error on duplicates. Called as last step in `loadFlowDefinition` before return.
- **Verification:** Unit test: synthetic flow with duplicate cp.id → throws. All 4 real flows (greenfield/brownfield/bugfix/refactor) load without error.

### Task 10: Add transcript-reuse path in runPhase() with config knob
- **Files:** `packages/core/src/orchestrator/index.ts`, `packages/core/src/config/loader.ts`.
- **Deliverable:** `runPhase(phase)` checks `.iagentek/.transcripts/<phase.id>.md` before LLM call. Reuses if mtime <24h AND size >200 bytes AND `!phase.agent.startsWith('__')`. Reads, logs `♻ Reusing...`, returns content. Config supports `transcripts.reuseWindowHours` (default 24).
- **Verification:** Unit test (Task 13). Manual: kill process post-LLM, resume → log shows `♻`, provider not called.

### Task 11: Write unit tests state.atomic.test.ts (10 cases)
- **File:** `packages/core/test/state.atomic.test.ts` (new).
- **Deliverable:** 10 tests covering: happy path, crash mid-write, rename retry, readonly file, ENOSPC, concurrent saves, stale tmp cleanup, recent tmp preserved, paths with spaces, UTF-8 with bidi marks.
- **Verification:** `npm test --workspace=@iagentek/core` shows 10 new tests passing on Node 18/20/22 × Ubuntu/Windows in CI matrix.

### Task 12: Write integration tests orchestrator.reconcile.test.ts (5 cases)
- **File:** `packages/core/test/orchestrator.reconcile.test.ts` (new).
- **Deliverable:** 5 tests: reconcile happy path, no false positives, full crash recovery flow, flow-loader rejects dupes, fully-autonomous mode no human prompt during recovery.
- **Verification:** `npm test` shows 5 new tests passing. Tests use the real Orchestrator with a mock provider that asserts NOT called during reconcile path.

### Task 13: Write unit tests for transcripts.reuse.test.ts (4 cases)
- **File:** `packages/core/test/transcripts.reuse.test.ts` (new).
- **Deliverable:** 4 tests: reused within 24h, not reused >24h, not reused if <200 bytes, builtin agents never reuse.
- **Verification:** `npm test` passes.

### Task 14: Bump versions to 0.4.5 in all 3 packages + CHANGELOG entry
- **Files:** `packages/cli/package.json`, `packages/core/package.json`, `packages/method/package.json`, root `CHANGELOG.md`.
- **Deliverable:** Version bumped, internal `^0.4.4` deps updated to `^0.4.5`, CHANGELOG section under `## v0.4.5` with bullet list per STORY.
- **Verification:** `npm install` resolves cleanly. `npx @iagentek/cli --version` will show `0.4.5` after build.

### Task 15: Smoke E2E
- **Where:** Any sandbox project + `iagentek-framework` itself.
- **Deliverable:** Manual procedure documented in `docs/release-smoke-v0.4.5.md`: init project, run cycle to story-done, kill process before checkpoint approval, run resume, verify no LLM call for already-transcribed phases, complete the cycle.
- **Verification:** Step-by-step output captured in the doc as ground truth for future regression.

### Task 16: npm publish for cli + core + method
- **Where:** Local terminal with npm auth for `@iagentek` org.
- **Deliverable:** Three packages published: `@iagentek/method@0.4.5`, `@iagentek/core@0.4.5`, `@iagentek/cli@0.4.5` (in that order — method first, then core, then cli, because of deps).
- **Verification:** `npm view @iagentek/cli version` shows `0.4.5`. `npx @iagentek/cli@0.4.5 --version` works on a clean machine.

---
**Generated by:** Scrum Master (2026-05-29)
