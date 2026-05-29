# Technical Plan: Memory System — Release 2 (v0.4.6 CONTEXT + HISTORY)

**Implements spec:** `specs/memory-system.md` (Release 2 section)

## Approach

Add a `MemoryManager` to `@iagentek/core` that hooks into the existing `Orchestrator` lifecycle and writes two artifacts on every relevant event: `CONTEXT.md` (regenerable snapshot, atomic) and `HISTORY.md` (append-only log). The `MemoryManager` is optional — injected via `OrchestratorOptions.memory?` — so any current consumer of `@iagentek/core` keeps working unchanged. The CLI always constructs and injects it.

No LLM call is added in this release. Both files are generated mechanically from existing in-process state. This avoids the entire scribe-injection threat surface — that arrives in v0.5.0.

The user-visible payoff lives in three places: a `Memory` block in `status`, a `Welcome back` block when `cycle`/`resume` is invoked >7 days after `state.updatedAt`, and a new `iagentek context` command. Plus a one-line confirmation `↳ Memory updated: ...` after each completed phase that makes the "everything is saved" promise visibly true.

## Affected components

- **`packages/core/src/memory/manager.ts`** (NEW) — `MemoryManager` class; public API consumed by `Orchestrator` and CLI commands.
- **`packages/core/src/memory/writer.ts`** (NEW) — atomic CONTEXT writer (tmp+rename+size-guard+.prev backup); append-only HISTORY writer with optional fsync.
- **`packages/core/src/memory/templates.ts`** (NEW) — CONTEXT.md/HISTORY.md frontmatter and section templates.
- **`packages/core/src/memory/bootstrap.ts`** (NEW) — backfill CONTEXT/HISTORY from existing artifacts for v0.4.4 projects.
- **`packages/core/src/memory/rotation.ts`** (NEW) — HISTORY rotation logic (≥500 entries OR ≥200 KB).
- **`packages/core/src/orchestrator/index.ts`** — inject `memory?: MemoryManager` in `OrchestratorOptions`; call hooks at 6 trigger points (additive, ~10 lines).
- **`packages/core/src/index.ts`** — export `MemoryManager`, `MemoryEvent` types.
- **`packages/cli/src/commands/cycle.ts`** — instantiate `MemoryManager`, install SIGINT handler.
- **`packages/cli/src/commands/status.ts`** — add `Memory` block and `Welcome back` branch.
- **`packages/cli/src/commands/resume.ts`** — surface last checkpoint notes at top.
- **`packages/cli/src/commands/context.ts`** (NEW) — print `CONTEXT.md`.
- **`packages/cli/src/bin/iagentek.ts`** — register `context` command.

## Data model (changes)

Two new files in `.iagentek/`:

### `CONTEXT.md`
```markdown
---
iagentek_context_version: 1
generated_at: 2026-05-29T14:32:11Z
generated_by: orchestrator
last_completed_phase: design
source_of_truth: state.json
---

# Project Context — <projectName>

> Regenerated at end of every approved phase. If this conflicts with `state.json`, **state.json wins** — this file is a derived view.

## What we are building
<from project-brief.md first paragraph, or "Pending discovery phase">

## Original idea (verbatim from human)
> <userIdea from initial cycle, or "—">

## Current status
- **Flow:** <flow.name>
- **Phase completed:** <last completed phase> (<agent>)
- **Next phase:** <next pending phase> (<agent>)
- **Cycle started:** <state.createdAt>
- **Checkpoints approved:** <count> / <total>

## Phases completed
| Phase | Agent | Approved at | Key artifact |
|---|---|---|---|
<one row per completed phase, key artifact = first file in phase.outputs that exists>

## Last checkpoint notes (verbatim)
> <state.checkpoints[last].notes, or "—">

## Key artifacts
- <relative path> — <one-line description from canonical mapping>
<repeat for each known artifact that exists on disk>

## How to resume
`npx @iagentek/cli resume`
```

### `HISTORY.md`
```markdown
---
iagentek_history_version: 1
rotation_policy: split-at-500-entries-or-200KB
current_entries: <count>
---

# Cycle History — <projectName>

> Append-only. Older entries rotated to `.iagentek/.archive/history-YYYY-MM.md`.

## Index
- [2026-05-29 14:32 — phase_completed — design / architect](#2026-05-29-1432--phase_completed--design--architect)
- ...

## Archive
- (none) | [history-2026-04.md](.archive/history-2026-04.md) — N entries

---

### 2026-05-29 14:32 — phase_completed — design / architect
- **Event:** phase_completed
- **Phase:** design
- **Agent:** architect
- **Provider:** anthropic / claude-opus-4-7
- **Files:** `.iagentek/architecture.md`, `.iagentek/plans/auth.md`
- **Checkpoint notes (verbatim):** "OK pero confirmar con Dev que el state.json no necesita locking en MVP"
- **Transcript:** `.iagentek/.transcripts/design.md`
```

### Event taxonomy (8 events)
| Event | Payload | CONTEXT regenerated? | HISTORY appended? |
|---|---|---|---|
| `cycle_started` | flow, userIdea, projectName | yes | yes |
| `phase_started` | phaseId, agent, startedAt | no | yes |
| `phase_output_received` | phaseId, transcriptPath, artifactsCount | no | yes |
| `checkpoint_prompted` | phaseId, checkpointId | no | yes |
| `checkpoint_approved` | phaseId, checkpointId, notes | yes | yes |
| `checkpoint_rejected` | phaseId, checkpointId | yes (status=paused) | yes |
| `phase_completed` | phaseId | yes | yes |
| `cycle_completed` / `cycle_interrupted` | reason | yes | yes |

## Contracts / API

```ts
// memory/manager.ts
export interface MemoryEvent {
  type:
    | 'cycle_started' | 'phase_started' | 'phase_output_received'
    | 'checkpoint_prompted' | 'checkpoint_approved' | 'checkpoint_rejected'
    | 'phase_completed' | 'cycle_completed' | 'cycle_interrupted'
  phaseId?: string
  agent?: string
  checkpointId?: string
  notes?: string
  artifactsCount?: number
  transcriptPath?: string
  ts: string                          // ISO-8601 UTC
}

export class MemoryManager {
  constructor(projectDir: string, state: StateManager, config: IAgentekConfig)
  exists(): boolean                   // CONTEXT.md OR HISTORY.md present
  async ensureInitialized(state: IAgentekState, userIdea?: string): Promise<void>
  async recordEvent(event: MemoryEvent): Promise<{ historyDelta: number; contextDelta: number | null }>
  async regenerateContext(): Promise<void>   // idempotent
  getRecentEvents(n: number): MemoryEvent[]  // tail of HISTORY.md, parsed
  hasArchives(): boolean
  daysSinceLastTouch(): number
}

// memory/writer.ts
export function atomicWriteContext(path: string, content: string): void
// throws if content < 200 bytes AND existing file > 200 bytes (anti-clobber)
// preserves CONTEXT.md.prev backup of previous content

export function appendHistoryEntry(path: string, markdown: string): void
// uses fs.appendFileSync; calls fsyncSync on the resulting fd (best-effort)

// memory/bootstrap.ts
export function bootstrapFromState(
  projectDir: string,
  state: IAgentekState,
  flow: FlowDefinition,
  config: IAgentekConfig
): { contextWritten: boolean; historyWritten: boolean }

// orchestrator/index.ts
export interface OrchestratorOptions {
  // ...existing
  memory?: MemoryManager                       // NEW, optional
}
```

## Pseudocode for the key logic

### MemoryManager hook integration in Orchestrator

```
Orchestrator.run():
  state = this.state.exists() ? this.state.load() : this.state.init(...)
  await this.opts.memory?.ensureInitialized(state, this.opts.userIdea)
  await this.opts.memory?.recordEvent({ type: 'cycle_started', ts: now() })
  reconcileState(state)                      // from v0.4.5

  for phase of enabledPhases:
    if state.completedPhases.includes(phase.id): continue
    this.state.setCurrentPhase(phase.id)
    await this.opts.memory?.recordEvent({
      type: 'phase_started', phaseId: phase.id, agent: phase.agent, ts: now()
    })

    output = await this.runPhase(phase)               // may return reused transcript
    scrubbed = scrubSecrets(output)
    writeFile(transcriptPath, scrubbed)
    artifacts = extractAndWriteArtifacts(scrubbed, projectDir)
    await this.opts.memory?.recordEvent({
      type: 'phase_output_received',
      phaseId: phase.id,
      transcriptPath,
      artifactsCount: artifacts.length,
      ts: now()
    })

    if phase.checkpoint:
      await this.opts.memory?.recordEvent({
        type: 'checkpoint_prompted',
        phaseId: phase.id,
        checkpointId: phase.checkpoint.id,
        ts: now()
      })
      const { decision, notes } = await this.checkpoints.run(...)
      if decision !== 'approve':
        await this.opts.memory?.recordEvent({
          type: 'checkpoint_rejected', phaseId: phase.id,
          checkpointId: phase.checkpoint.id, ts: now()
        })
        return
      // unified save (Option C from v0.4.5)
      this.state.save({ checkpoints: [...], completedPhases: [...], currentPhase: null })
      await this.opts.memory?.recordEvent({
        type: 'checkpoint_approved',
        phaseId: phase.id,
        checkpointId: phase.checkpoint.id,
        notes,
        ts: now()
      })

    await this.opts.memory?.recordEvent({
      type: 'phase_completed', phaseId: phase.id, ts: now()
    })

  await this.opts.memory?.recordEvent({ type: 'cycle_completed', ts: now() })
```

### `recordEvent` core

```
async recordEvent(event):
  // 1. Append HISTORY (cheap, write-through, fsync on critical events)
  entry = renderHistoryEntry(event, /* lookup notes, artifacts, etc */)
  appendHistoryEntry(this.historyPath, entry)
  historyDelta = entry.length

  // 2. Maybe rotate
  if shouldRotate(this.historyPath):
    rotate(this.historyPath, this.archiveDir)

  // 3. Regenerate CONTEXT only for events that change snapshot semantics
  contextDelta = null
  if event.type in {'cycle_started', 'checkpoint_approved',
                    'checkpoint_rejected', 'phase_completed',
                    'cycle_completed', 'cycle_interrupted'}:
    contextDelta = await this.regenerateContext()

  return { historyDelta, contextDelta }
```

### Atomic CONTEXT write with size guard + backup

```
atomicWriteContext(path, content):
  if content.length < 200 and existsSync(path):
    existing = statSync(path).size
    if existing > 200:
      logger.warn(`  ⚠️  Skipped CONTEXT regeneration: candidate (${content.length} bytes) much smaller than existing (${existing} bytes).`)
      return                                           // anti-clobber

  // Preserve .prev (rotating single backup)
  if existsSync(path):
    try:
      copyFileSync(path, `${path}.prev`)
    catch {}                                           // best-effort

  tmpPath = `${path}.${process.pid}.${randomHex(6)}.tmp`
  fd = openSync(tmpPath, 'wx')
  try:
    writeSync(fd, content, 0, 'utf-8')
    fsyncSync(fd)
  finally:
    closeSync(fd)

  renameWithRetry(tmpPath, path, attempts=5, delays=[10,30,80,200,500])
```

### Append HISTORY with safety markers

```
appendHistoryEntry(path, markdown):
  // Each entry begins with a marker that the parser can use to detect truncation:
  //    <!-- iagentek:entry:start ts=...
  //    ... body ...
  //    <!-- iagentek:entry:end -->
  // If a future reader finds a start without a matching end, the entry is reported as truncated.
  ensureHistoryHeaderExists(path)
  fd = openSync(path, 'a')
  try:
    writeSync(fd, markdown, null, 'utf-8')
    try { fsyncSync(fd) } catch {}                     // best-effort on network FS
  finally:
    closeSync(fd)
```

### Rotation

```
shouldRotate(path):
  if !existsSync(path): return false
  size = statSync(path).size
  entryCount = countEntries(path)                      // grep marker
  return entryCount >= 500 || size >= 200_000

rotate(path, archiveDir):
  mkdirSync(archiveDir, { recursive: true })
  month  = monthOf(statSync(path).mtimeMs)             // e.g. "2026-05"
  target = join(archiveDir, `history-${month}.md`)
  entries = parseEntries(readFileSync(path, 'utf-8'))
  keep   = entries.slice(-50)                           // sliding window of recent 50
  older  = entries.slice(0, -50)

  // Append older entries to month archive (which may already exist)
  appendFileSync(target, renderArchiveHeader(month) + renderEntries(older))

  // Rewrite main file with header + recent entries + archive index
  newMain = renderHistoryHeader() + renderEntries(keep) + renderArchiveIndex(archiveDir)
  atomicWriteContext(path, newMain)                     // reuse atomic writer
```

### Bootstrap for v0.4.4 projects

```
ensureInitialized(state, userIdea):
  if exists(this.contextPath) || exists(this.historyPath): return

  // Brand new project: create empty CONTEXT shell, no HISTORY entry yet (cycle_started will append)
  if state.completedPhases.length === 0 && state.checkpoints.length === 0:
    initialContext = renderContextTemplate({
      projectName: state.projectName,
      flowName: state.flow,
      userIdea,
      state,
      bootstrap: false
    })
    atomicWriteContext(this.contextPath, initialContext)
    return

  // v0.4.4 project being upgraded: backfill
  result = bootstrapFromState(this.projectDir, state, this.flow, this.config)
  if result.contextWritten:
    logger.dim('  📚 Bootstrapped memory from existing v0.4.4 state.')


bootstrapFromState(projectDir, state, flow, config):
  // Backfill CONTEXT from project-brief.md + PRD.md + state
  context = renderContextTemplate({ ..., bootstrap: true })
  atomicWriteContext(contextPath, context)

  // Backfill HISTORY: one synthetic entry per completed phase, one per checkpoint approved
  for phase in enabledPhases(flow):
    if state.completedPhases.includes(phase.id):
      appendHistoryEntry(historyPath, renderSyntheticEntry({
        type: 'phase_completed',
        phaseId: phase.id,
        agent: phase.agent,
        ts: state.updatedAt,                            // best-effort, marked as "reconstructed"
        synthetic: true
      }))
  return { contextWritten: true, historyWritten: true }
```

### CLI integration

#### `cycle.ts` — instantiate + SIGINT
```
runCycle():
  // ...existing
  const memory = new MemoryManager(cwd, configMgr, ...)
  const orchestrator = new Orchestrator({ ..., memory })

  process.once('SIGINT', () => {
    try {
      memory.recordEventSync({ type: 'cycle_interrupted', ts: now(), reason: 'SIGINT' })
    } catch {}
    process.exit(130)
  })

  await orchestrator.run()
```

#### `status.ts` — `Memory` block + `Welcome back`
```
runStatus():
  // ...existing
  const days = memory.daysSinceLastTouch()
  if days > 7:
    printWelcomeBack(memory, days)                      // see strings below
  else:
    printCompactStatus()

  if memory.exists():
    printMemoryBlock(memory)                            // see strings below


printWelcomeBack(memory, days):
  print(`Welcome back to ${projectName}. Last activity ${days} days ago.`)
  print('')
  print('  CONTEXT (auto-summary)')
  print(indent(memory.summary(), 4))                    // first 5 lines of CONTEXT.md "What we are building" + "Current status"
  print('')
  print('  Last 5 events')
  for ev in memory.getRecentEvents(5):
    print(`    ${formatAge(ev.ts)}  ${ev.type.padEnd(22)}  ${ev.summary}`)
  print('')
  if memory.lastCheckpointNotes:
    print('  Your last note')
    print(`    "${memory.lastCheckpointNotes}"`)
    print('')
  print(`  Next step:`)
  print(`    npx @iagentek/cli resume`)


printMemoryBlock(memory):
  print('')
  print('Memory')
  print(`  CONTEXT.md      last updated ${humanizeAge(memory.contextMtime)}  (${memory.contextSize})`)
  print(`  HISTORY.md      ${memory.historyEntryCount} entries${memory.hasArchives() ? ` (+ archives)` : ''}`)
```

#### `context.ts` — new command
```
runContext({ cwd }):
  contextPath = join(cwd, '.iagentek', 'CONTEXT.md')
  if !existsSync(contextPath):
    logger.error('No CONTEXT.md found. Run `iagentek cycle` first.')
    return
  content = readFileSync(contextPath, 'utf-8')
  if process.stdout.isTTY:
    print(kleur.cyan.bold(content))                     // or markdown-rendered
  else:
    print(content)                                       // pipe-friendly, no color
```

#### Trigger string after each phase
After phase completion (`onAgentOutput` already exists in cycle.ts):
```
logger.dim(`  ↳ Memory updated: HISTORY +1 entry, CONTEXT +${contextDelta} chars`)
```

## Required tests

### Unit — `memory/writer.test.ts` (8 cases)
1. `atomicWriteContext` happy path → file written, no tmp leaked, `.prev` created.
2. Size-guard: tiny content (<200 B) over existing large file → write SKIPPED, original intact, warning logged.
3. Size-guard: tiny content over tiny file → write proceeds (no protection needed).
4. `.prev` rotation: write, then write again → only one `.prev` exists, contains penultimate content.
5. `appendHistoryEntry` happy path → entry appended verbatim with markers.
6. `appendHistoryEntry` on missing file → ensures header, then appends.
7. `appendHistoryEntry` on read-only FS → throws clear error.
8. `appendHistoryEntry` fsync `EINVAL` (mock) → silent, append succeeded.

### Unit — `memory/bootstrap.test.ts` (4 cases)
1. New project (empty state) → empty CONTEXT created, no HISTORY entries.
2. v0.4.4 project with 3 completed phases → CONTEXT + 3 synthetic HISTORY entries.
3. v0.4.4 project with brief + PRD but no completed phases → CONTEXT populated from brief, HISTORY empty.
4. Idempotency: `ensureInitialized` twice → second call is no-op.

### Unit — `memory/rotation.test.ts` (3 cases)
1. 500 entries reached → rotates older 450 to monthly archive, keeps recent 50.
2. 200 KB reached with <500 entries → rotates by size.
3. Archive index in main HISTORY.md after rotation → links to archive file.

### Integration — `memory/manager.integration.test.ts` (6 cases)
1. Full cycle: `MemoryManager` receives 8 events in order, HISTORY contains 8 entries, CONTEXT regenerated 5 times (on snapshot-relevant events only).
2. SIGINT mid-phase: `cycle_interrupted` recorded.
3. `getRecentEvents(5)` returns tail of HISTORY parsed correctly.
4. `daysSinceLastTouch()` returns expected value from `state.updatedAt`.
5. `MemoryManager` injected as `undefined` (legacy consumer) → Orchestrator runs without errors.
6. CONTEXT atomicity under concurrent regenerate calls → final file is one of the two complete writes, never a mix.

### E2E (one full smoke)
1. `init` → `cycle` greenfield → pause 8 simulated days → `status` shows `Welcome back` block → `resume` → cycle completes → `iagentek context` prints CONTEXT.md.

## Technical risks

- **HISTORY.md grows unbounded if rotation has a bug** → user opens it in editor, lag. **Mitigation:** rotation is unit-tested with synthetic 1000-entry input; size guard at 200 KB triggers first. Manual sanity check at QA.
- **CONTEXT regeneration loses information present in `state.updatedAt` history** → snapshot doesn't include all `checkpoints[].notes`. **Mitigation:** CONTEXT shows only the LAST checkpoint notes verbatim; HISTORY preserves all of them. Two-file design is intentional.
- **Bootstrap of v0.4.4 project picks wrong timestamps** → synthetic entries all show `state.updatedAt` (the latest), giving false impression all phases finished today. **Mitigation:** synthetic entries carry `<!-- iagentek:synthetic=true reconstructed from state.json -->` marker; rendered in HISTORY with "(reconstructed)" tag.
- **CONTEXT.md.prev pollution** → after many cycles, `.prev` files accumulate. **Mitigation:** single `.prev` per file, rotated on each write. Only one extra file per `.iagentek/` no matter how many cycles run.
- **Markdown rotation produces broken anchors in index** → `## Index` links point to entries that no longer exist in main file. **Mitigation:** rotation rebuilds the index from current entries only.
- **Concurrent `iagentek cycle` runs corrupt HISTORY** → append racing. **Mitigation:** documented limitation for v0.4.6; lockfile is v0.5.0 scope (will protect both PREFERENCES and HISTORY). Single-process usage is the assumed model.

## Complexity estimate

- **Size:** L
- **Rationale:** ~700 LoC added (5 new files in `core/src/memory/`, 4 CLI command files touched, 1 new CLI command). ~23 new test cases. New event taxonomy and rendering. CLI output strings need exact-match QA. Cross-platform write atomicity reuses v0.4.5 primitives (already tested). Estimated ~10 dev days including templates, tests, CLI strings, docs section in README, new `docs/memory-system.md`.

---

**Generated by:** Architect (claude-opus-4-7 via consilium 2026-05-29) | **Atomic tasks at:** `tasks/memory-context-history.md`
