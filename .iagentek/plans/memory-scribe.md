# Technical Plan: Memory System — Release 3 (v0.5.0 Scribe + PREFERENCES)

**Implements spec:** `specs/memory-system.md` (Release 3 section, including the 8 blocking security mitigations)

## Approach

Add the `scribe` agent — the 10th BMAD agent — as a hook invoked automatically by the orchestrator after every approved checkpoint. The scribe is NOT a phase in any flow YAML; it runs implicitly. It reads the just-approved transcript + the human's checkpoint notes + current `PREFERENCES.md`, and proposes up to 3 mutations (`memory:add | memory:update | memory:deprecate | memory:none`) in a strictly structured output format. The orchestrator parses the scribe's output, applies validated mutations to `PREFERENCES.md`, and discards everything else.

**The parser is the security boundary, not the LLM.** Every blocking mitigation lives in the parser/writer path. The LLM is treated as semi-honest at best: schema validation, lexical filtering, Unicode sanitization, and protected-flag enforcement all run on the parser side. The scribe agent's prompt mirrors these constraints but the runtime never trusts the agent to enforce them.

Downstream agents (Analyst, PM, Architect, Dev, QA, DevOps, Debugger, Refactor-Architect, Scrum-Master) receive **only the `statement` field** of each non-deprecated preference, wrapped in `wrapUntrusted`. The `why`, `edge-case`, and `reason` fields are persisted for audit but never sent to other LLMs — this single decision reduces the per-mutation injection budget by ~3x.

## Affected components

- **`packages/method/assets/en/agents/scribe.md`** (NEW) — agent prompt with embedded few-shot examples and hard security rules.
- **`packages/method/assets/es/agents/scribe.md`** (NEW) — Spanish equivalent.
- **`packages/method/src/index.ts`** — register `'scribe'` in `AgentRole` union and `loadAgent` map.
- **`packages/core/src/memory/scribe.ts`** (NEW) — orchestrator hook; invokes scribe; parses output.
- **`packages/core/src/memory/scribe-parser.ts`** (NEW) — parser + ALL 8 blocking mitigations. Single file for audit.
- **`packages/core/src/memory/preferences.ts`** (NEW) — reader/writer with lockfile, mtime check, sanitization, protected-flag enforcement.
- **`packages/core/src/memory/preferences-injector.ts`** (NEW) — produces the wrapped, statement-only PREFERENCES payload to inject into agent prompts.
- **`packages/core/src/memory/erosion-detector.ts`** (NEW) — flags N-consecutive updates on the same pref as a `⚠ erosion pattern detected` signal in status.
- **`packages/core/src/orchestrator/index.ts`** — call `runScribeHook` after `checkpoint_approved` event, never throw; call `injectPreferences` in `buildPhaseContext`.
- **`packages/core/src/config/loader.ts`** — add `scribe: { enabled: boolean; mode?: 'review' | 'auto' }` and `memory.curator` fields.
- **`packages/cli/src/commands/preferences.ts`** (NEW) — list/edit/show/protect preferences.
- **`packages/cli/src/commands/cycle.ts`** — add `--no-scribe` flag (persists to config).
- **`packages/cli/src/commands/status.ts`** — show preferences count + erosion warnings if any.
- **`packages/cli/src/bin/iagentek.ts`** — register `preferences` command.
- **`iagentek-plugin/commands/iagentek-context.md`** (NEW) — slash command.
- **`iagentek-plugin/commands/iagentek-recall.md`** (NEW) — slash command.
- **`iagentek-plugin/.claude-plugin/marketplace.json`** — register new slash commands.

## Data model (changes)

### `PREFERENCES.md`
```markdown
---
iagentek_preferences_version: 1
inject_into_prompt: true
inject_field: statement                       # statement-only injection (mitigation B-8)
inject_max_chars: 4000
---

# Project Preferences — <projectName>

> Maintained automatically by the `scribe` agent after every approved checkpoint.
> Edit manually with `iagentek preferences --edit`.

---

### PREF-001 — package-manager-pnpm
- **Category:** tooling
- **Status:** active
- **Protected:** false
- **Statement:** Use pnpm as the only package manager across the monorepo; yarn and npm install are not permitted.
- **Why:** Human explicitly stated in planning checkpoint notes.
- **Edge case:** —
- **Source:** phase:planning (2026-05-29T14:32Z)
- **Confidence:** high

### PREF-002 — typescript-strict
- **Category:** code-style
- **Status:** active
- **Protected:** true                                    ← cannot be deprecated by scribe
- **Statement:** TypeScript strict mode is mandatory across all packages; no `any` types in production code.
- **Why:** Constitution principle #3, validated through three approved checkpoints.
- **Edge case:** Test fixtures may use `// eslint-disable-next-line` with rationale.
- **Source:** phase:design (2026-05-24T19:02Z)
- **Confidence:** high
```

### Pref id format
`PREF-NNN` where `NNN` is a 3-5 digit sequential integer assigned by the writer (never by the scribe — the scribe proposes a kebab-case slug; the writer maps it to `PREF-NNN`). This protects the `id` field from injection (`../../etc`, `__proto__`, etc.).

### Closed enums
```
category   = tech-stack | code-style | tooling | testing | infra | product | process
status     = active | deprecated
confidence = high | medium
update_field = statement | why | edge-case | status        // whitelist for memory:update
```

## Contracts / API

```ts
// memory/scribe-parser.ts
export interface ScribeMutation {
  type: 'add' | 'update' | 'deprecate' | 'none'
  payload: ScribeAddPayload | ScribeUpdatePayload | ScribeDeprecatePayload | ScribeNonePayload
  raw: string                                    // original block for audit
}

export interface ParseResult {
  applied: ScribeMutation[]
  rejected: { mutation: Partial<ScribeMutation>; reason: string }[]
  cycleAborted: boolean                          // true if memory:* found in non-scribe source
}

export function parseScribeOutput(
  output: string,
  source: 'scribe' | 'transcript',               // mitigation B-1
  currentPrefs: Preference[]
): ParseResult

// memory/preferences.ts
export interface Preference {
  id: string                                     // PREF-NNN
  slug: string                                   // from scribe, sanitized
  category: Category
  status: 'active' | 'deprecated'
  protected: boolean
  statement: string
  why?: string
  edgeCase?: string
  source: string                                 // "phase:<id> (ISO ts)"
  confidence: 'high' | 'medium'
}

export class PreferencesManager {
  constructor(projectDir: string)
  load(): Preference[]                           // tolerant of garbage; ignores unparseable entries
  applyMutations(muts: ScribeMutation[]): { applied: number; skipped: number }
                                                  // takes lockfile, mtime-checks, writes atomically
  setProtected(id: string, protected: boolean): void   // manual edit only
  exists(): boolean
}

// memory/preferences-injector.ts
export function buildPreferencesPayload(prefs: Preference[]): string
// returns: wrapUntrusted(
//   prefs
//     .filter(p => p.status === 'active')
//     .map(p => `- [${p.category}] ${p.statement}`)
//     .join('\n'),
//   'iagentek-preferences'
// )

// memory/scribe.ts
export async function runScribeHook(opts: {
  projectDir: string
  config: IAgentekConfig
  provider: AIProvider
  state: StateManager
  phase: PhaseDefinition
  transcript: string
  checkpointNotes?: string
}): Promise<{ proposed: number; applied: number; skipped: number }>
// MUST NOT throw. Logs on failure. Saves scribe transcript to .iagentek/.transcripts/scribe-<phaseId>.md.
```

## Pseudocode for the key logic

### 1. Scribe invocation hook (in orchestrator)

```
// In Orchestrator.run(), after `recordEvent({ type: 'checkpoint_approved', ... })`:
if config.scribe?.enabled !== false:
  try:
    await runScribeHook({
      projectDir, config, provider,
      state: this.state, phase,
      transcript: scrubbed,                       // already scrubbed
      checkpointNotes: notes
    })
  catch e:
    // Scribe hook MUST NEVER block the cycle.
    logger.warn(`  ⚠️  Scribe hook failed: ${e.message}. Continuing cycle.`)
```

### 2. `runScribeHook`

```
runScribeHook(opts):
  prefsManager  = new PreferencesManager(opts.projectDir)
  currentPrefs  = prefsManager.exists() ? prefsManager.load() : []

  scribePrompt  = loadAgent('scribe', config.language).prompt
  contextMsg    = buildScribeContext({
                    phaseId: opts.phase.id,
                    transcript: wrapUntrusted(opts.transcript, 'transcript'),
                    notes: wrapUntrusted(opts.checkpointNotes ?? '', 'notes'),
                    currentPreferences: renderForScribe(currentPrefs),  // PREF-id + statement only
                  })

  // ----- 0a. Sanity check: ensure no memory:* leakage in transcript before sending -----
  if /```memory:(add|update|deprecate|none)/.test(opts.transcript):
    logger.error('  🛑 Phase transcript contains memory:* blocks. Aborting scribe (mitigation B-1).')
    return { proposed: 0, applied: 0, skipped: 0 }

  // ----- 1. Call scribe LLM with strict timeout -----
  rawOutput = await withTimeout(
    opts.provider.complete(
      [{ role: 'user', content: contextMsg }],
      { system: scribePrompt, model: config.provider.model }
    ),
    timeoutMs = 60_000
  )

  // Save transcript regardless (audit)
  writeFile(`.iagentek/.transcripts/scribe-${opts.phase.id}.md`, scrubSecrets(rawOutput))

  // ----- 2. Parse, applying B-1..B-3, B-5, B-8 -----
  parseResult = parseScribeOutput(rawOutput, 'scribe', currentPrefs)
  if parseResult.cycleAborted:
    logger.error('  🛑 Scribe output indicates injection — cycle aborted.')
    throw new Error('SCRIBE_OUTPUT_TAINTED')

  // ----- 3. B-6: filter mutations that target protected prefs -----
  filtered = parseResult.applied.filter(m =>
    !(m.type === 'update' || m.type === 'deprecate') ||
    !currentPrefs.find(p => p.slug === m.payload.id)?.protected
  )
  if filtered.length < parseResult.applied.length:
    logger.warn(`  🛡  ${parseResult.applied.length - filtered.length} mutation(s) blocked: targeted protected prefs.`)

  // ----- 4. B-4: human diff in interactive mode -----
  if config.mode === 'autonomous-with-checkpoints' && filtered.length > 0:
    diff = renderPreferencesDiff(currentPrefs, filtered)
    decision = await promptHumanDiffApproval(diff)             // default = approve
    if decision !== 'approve':
      logger.dim('  📝 Scribe proposals rejected by human.')
      return { proposed: filtered.length, applied: 0, skipped: filtered.length }

  // ----- 5. B-7: lockfile + mtime-checked write -----
  result = prefsManager.applyMutations(filtered)               // sanitization B-5 inside writer

  logger.dim(`  ✍  Scribe: ${result.applied} preference(s) updated, ${result.skipped} skipped.`)
  return { proposed: filtered.length, applied: result.applied, skipped: result.skipped }
```

### 3. Parser with mitigations B-1..B-3, B-5, B-8

```
parseScribeOutput(output, source, currentPrefs):
  result = { applied: [], rejected: [], cycleAborted: false }

  // B-1: only scribe source is trusted as origin
  if source !== 'scribe':
    result.cycleAborted = true
    return result

  blocks = extractCodeBlocks(output, langs=['memory:add','memory:update','memory:deprecate','memory:none'])
  if blocks.length === 0:
    return result                                              // no mutations is valid

  if blocks.length > 10:                                       // pre-cap sanity
    result.rejected.push({ reason: 'too many blocks before cap' })
    blocks = blocks.slice(0, 10)

  for block in blocks:
    try:
      payload = parseYamlBlock(block.body)                     // strict YAML, fail on extra keys

      // B-2: full-field validation
      validateFields(payload, block.lang, currentPrefs)        // see below

      // B-5: Unicode sanitization on ALL string fields
      for field in ['statement', 'why', 'edge-case', 'reason']:
        if payload[field]:
          payload[field] = sanitizeUnicode(payload[field])     // strip bidi U+202A..U+202E, U+2066..U+2069, ZWSP U+200B..U+200D, BOM U+FEFF, control chars

      mutation = { type: shortType(block.lang), payload, raw: block.body }
      result.applied.push(mutation)
    catch e:
      result.rejected.push({ mutation: { raw: block.body }, reason: e.message })

  // Cap of 3 enforced at parser level (the prompt also enforces it; this is belt-and-suspenders)
  if result.applied.length > 3:
    overflow = result.applied.slice(3)
    result.applied = result.applied.slice(0, 3)
    for m in overflow:
      result.rejected.push({ mutation: m, reason: 'cap of 3 exceeded' })

  return result


validateFields(payload, blockLang, currentPrefs):
  switch blockLang:
    case 'memory:add':
      requireFields(payload, ['id','category','statement','source','confidence'])
      forbidExtraFields(payload, ['id','category','statement','source','confidence'])
      // B-3: id regex
      if !/^[a-z0-9][a-z0-9-]{0,39}$/.test(payload.id):
        throw 'invalid id format'
      // B-3: category enum
      if !CATEGORIES.has(payload.category):
        throw 'invalid category'
      validateStringField(payload.statement, maxLen=200, fieldName='statement')
      validateStringField(payload.source, regex=/^phase:[a-z0-9-]+$/, fieldName='source')
      if payload.confidence !== 'high' && payload.confidence !== 'medium':
        throw 'confidence must be high or medium'
      // Duplicate detection (60% lexical overlap)
      if findSimilar(currentPrefs, payload.statement, threshold=0.6):
        throw 'duplicate of existing preference'

    case 'memory:update':
      requireFields(payload, ['id','statement','source','reason'])
      forbidExtraFields(payload, ['id','statement','source','reason'])
      ref = currentPrefs.find(p => p.slug === payload.id)
      if !ref:
        throw 'unknown id for update'
      // B-6: protected flag check happens after parse (orchestrator)
      validateStringField(payload.statement, maxLen=200, fieldName='statement')
      validateStringField(payload.reason, maxLen=120, fieldName='reason')

    case 'memory:deprecate':
      requireFields(payload, ['id','reason'])
      forbidExtraFields(payload, ['id','reason'])
      if !currentPrefs.find(p => p.slug === payload.id):
        throw 'unknown id for deprecate'
      validateStringField(payload.reason, maxLen=120, fieldName='reason')

    case 'memory:none':
      requireFields(payload, ['reason'])
      forbidExtraFields(payload, ['reason'])
      validateStringField(payload.reason, maxLen=120, fieldName='reason')


validateStringField(value, { maxLen, regex, fieldName }):
  if typeof value !== 'string':
    throw `${fieldName} must be string`
  if value.length === 0 || value.length > maxLen:
    throw `${fieldName} length out of bounds`
  // Forbidden substrings (all fields)
  for sub in ['<<<UNTRUSTED_INPUT', 'file:', 'memory:', '<|', '</', '```',
              'ignore previous', 'act as', 'system:', 'from now on always',
              'http://', 'https://', 'ftp://', 'AKIA', 'sk-ant-', 'sk-proj-',
              'AIza', 'ghp_', 'ghs_', 'xoxb-', 'xoxp-']:
    if value.toLowerCase().includes(sub.toLowerCase()):
      throw `${fieldName} contains forbidden substring '${sub}'`
  // Absolute paths
  if /^([\/\\]|[a-zA-Z]:\\)/.test(value) || /\\\\[^\\]/.test(value):
    throw `${fieldName} contains absolute path`
  // Control chars (allow LF only — but actually we reject LF too in single-line fields)
  if /[ --]/.test(value):
    throw `${fieldName} contains control characters`
  if regex && !regex.test(value):
    throw `${fieldName} does not match required format`
```

### 4. `PreferencesManager.applyMutations` with lockfile (B-7) and atomic write

```
applyMutations(mutations):
  // B-7: take lockfile + mtime check
  lockPath = `${this.prefsPath}.lock`
  mtimeBefore = existsSync(this.prefsPath) ? statSync(this.prefsPath).mtimeMs : 0

  if existsSync(lockPath):
    age = Date.now() - statSync(lockPath).mtimeMs
    if age < 60_000:                                            // active lock, abort
      logger.warn('  ⏳ PREFERENCES.lock held — skipping scribe mutations.')
      return { applied: 0, skipped: mutations.length }
    // stale lock: remove
    try { unlinkSync(lockPath) } catch {}

  writeFileSync(lockPath, JSON.stringify({ pid: process.pid, ts: now() }))

  try:
    // Re-check mtime: if changed since we entered this method, abort
    if existsSync(this.prefsPath) && statSync(this.prefsPath).mtimeMs !== mtimeBefore:
      logger.warn('  ⏳ PREFERENCES.md changed externally — skipping scribe mutations.')
      return { applied: 0, skipped: mutations.length }

    prefs = this.load()
    applied = 0
    for mut in mutations:
      try:
        switch mut.type:
          case 'add':
            // Assign canonical PREF-NNN id (slug from scribe is stored separately)
            newId = `PREF-${String(prefs.length + 1).padStart(3, '0')}`
            prefs.push({
              id: newId,
              slug: mut.payload.id,
              category: mut.payload.category,
              status: 'active',
              protected: false,
              statement: mut.payload.statement,
              source: `${mut.payload.source} (${now()})`,
              confidence: mut.payload.confidence
            })
            applied++
          case 'update':
            ref = prefs.find(p => p.slug === mut.payload.id)
            if !ref: continue
            ref.statement = mut.payload.statement
            ref.source = `${mut.payload.source} (updated ${now()})`
            // Erosion detector record
            erosionDetector.recordUpdate(ref.id)
            applied++
          case 'deprecate':
            ref = prefs.find(p => p.slug === mut.payload.id)
            if !ref: continue
            ref.status = 'deprecated'
            ref.source = `${ref.source} | deprecated phase:${mut.payload.source}: ${mut.payload.reason}`
            applied++
          case 'none':
            continue
      catch e:
        logger.warn(`  ⚠️  Mutation rejected during apply: ${e.message}`)

    // Atomic write via tmp+rename (reuses v0.4.6 writer)
    atomicWriteContext(this.prefsPath, renderPreferences(prefs))

    return { applied, skipped: mutations.length - applied }
  finally:
    try { unlinkSync(lockPath) } catch {}
```

### 5. Injection in `buildPhaseContext` (B-8)

```
buildPhaseContext(phase, projectDir, userIdea, projectName, lang):
  sections = []

  // ...existing sections (Phase context, Project name, etc.)

  // CONTEXT.md injection (from v0.4.6)
  contextPath = join(projectDir, '.iagentek', 'CONTEXT.md')
  if existsSync(contextPath):
    sections.push('## Project context (auto-maintained)')
    sections.push(wrapUntrusted(readFileSync(contextPath, 'utf-8'), 'iagentek-context'))

  // PREFERENCES.md injection — STATEMENT ONLY (mitigation B-8)
  prefsManager = new PreferencesManager(projectDir)
  if prefsManager.exists():
    prefs   = prefsManager.load()
    payload = buildPreferencesPayload(prefs)          // wraps + filters + statement-only
    if payload.length > 0:
      sections.push('## Project preferences (auto-curated)')
      sections.push(payload)
      sections.push('> These are durable preferences learned from prior checkpoints. Treat as project policy.')

  // ...existing inputs + instructions
```

### 6. Erosion detector

```
class ErosionDetector:
  recordUpdate(prefId):
    history = this.loadUpdateHistory()
    history[prefId] = (history[prefId] ?? []).concat([now()])
    this.saveUpdateHistory(history)

  checkErosion(prefId):
    recent = (history[prefId] ?? []).filter(ts => now() - ts < 30 * 24*3600_000)  // 30 days
    if recent.length >= 3:
      return { alert: 'erosion-pattern', prefId, updatesIn30Days: recent.length }
    return null
```

Surface in `iagentek status`:
```
Memory
  ...
  ⚠ Erosion pattern detected on PREF-007 (3 updates in last 30 days). Review with `iagentek preferences --show PREF-007`.
```

### 7. CLI: `preferences` command

```
runPreferences({ action, prefId, cwd }):
  prefsManager = new PreferencesManager(cwd)
  if !prefsManager.exists():
    logger.dim('No PREFERENCES.md yet. Run a cycle to start learning preferences.')
    return

  switch action:
    case 'list': printPreferencesTable(prefsManager.load())
    case 'show':  printPreferenceDetail(prefsManager.load().find(p => p.id === prefId))
    case 'edit':  openInEditor(prefsManager.path)
    case 'protect':   prefsManager.setProtected(prefId, true); logger.success(`Protected ${prefId}.`)
    case 'unprotect': prefsManager.setProtected(prefId, false); logger.success(`Unprotected ${prefId}.`)
```

CLI commands registered in `bin/iagentek.ts`:
```
program
  .command('preferences [action] [prefId]')
  .description('List, show, edit, or protect project preferences (list | show | edit | protect | unprotect)')
  .option('--cwd <dir>', 'Project directory', process.cwd())
  .action(runPreferences)
```

### 8. Claude Code plugin slash commands

#### `iagentek-plugin/commands/iagentek-context.md`
```markdown
---
description: "Print the current project's CONTEXT.md from .iagentek/"
allowed-tools: [Read, Bash]
---

Read `.iagentek/CONTEXT.md` from the current project directory and print it inline.
If it does not exist, suggest running `npx @iagentek/cli cycle` first.
```

#### `iagentek-plugin/commands/iagentek-recall.md`
```markdown
---
description: "Search project HISTORY.md (and archives) for events matching a query"
allowed-tools: [Read, Grep, Bash]
arguments: "$ARGUMENTS"
---

Grep `.iagentek/HISTORY.md` and `.iagentek/.archive/*.md` for entries matching `$ARGUMENTS`.
Return matched entries with timestamp, event type, and one-line summary.
```

## Required tests

### Unit — `scribe-parser.test.ts` — ONE TEST PER BLOCKING MITIGATION
- **B-1.1:** memory:add block present in transcript (not scribe output) → `cycleAborted: true`.
- **B-1.2:** scribe output with valid memory:add block → parsed normally.
- **B-2.1:** memory:add with extra field `bonus: malicious` → rejected.
- **B-2.2:** memory:add missing required field `category` → rejected.
- **B-3.1:** id = `../etc/passwd` → rejected.
- **B-3.2:** id = `__proto__` → rejected.
- **B-3.3:** category = `security` (not in enum) → rejected.
- **B-3.4:** memory:update with field = `protected` (not in whitelist) → rejected.
- **B-5.1:** statement contains U+202E (RTL override) → sanitized to remove it.
- **B-5.2:** statement contains U+200B (ZWSP) → sanitized.
- **B-5.3:** statement contains literal `‮` (text, not codepoint) → preserved (no over-sanitization).
- **B-8.1:** PREFERENCES payload built by injector contains ONLY statements (no why, no edge-case).
- **B-8.2:** PREFERENCES payload wrapped with `wrapUntrusted` label `iagentek-preferences`.
- **Cap:** scribe emits 5 memory:add → only first 3 in `applied`, remaining 2 in `rejected`.
- **Duplicate:** scribe emits memory:add 70% lexically similar to existing → rejected.
- **Forbidden substrings:** statement contains "ignore previous" → rejected. Same for `file:`, `http://`, `sk-ant-`, etc.
- **Absolute paths:** statement contains `C:\Users\...` → rejected.
- **Length cap:** statement = 201 chars → rejected.
- **memory:none with extra blocks:** if scribe emits both none AND add → none is ignored, adds processed.

### Unit — `preferences.test.ts` (10 cases)
1. Load empty PREFERENCES.md → returns `[]`.
2. Load with 3 active + 1 deprecated → returns all 4 with status flag.
3. `applyMutations` with single `add` → file updated, new PREF-NNN allocated.
4. `applyMutations` with `update` on PREF-001 → statement changed, source updated.
5. `applyMutations` with `deprecate` on PREF-001 → status = deprecated, original preserved with note.
6. Lockfile contention: another process holds fresh lockfile → mutations skipped, file untouched.
7. Stale lockfile (>60s old) → removed, mutations applied.
8. Mtime check: file modified externally between read and write → mutations aborted.
9. Protected pref + memory:update → mutation skipped (filtered by hook, but writer also defensively skips).
10. Atomic write: simulate crash during write → original PREFERENCES.md intact.

### Unit — `preferences-injector.test.ts` (3 cases)
1. Active prefs only included, deprecated excluded.
2. Output is wrapped with `<<<UNTRUSTED_INPUT_BEGIN iagentek-preferences>>>` markers.
3. Only `statement` field present in output — no `why`, no `edge-case`, no `source`.

### Integration — `scribe.integration.test.ts` (8 cases)
1. Full hook flow: approved checkpoint → scribe called → 1 valid memory:add → applied → HISTORY entry added.
2. Hook with provider timeout → exception caught, cycle continues.
3. Hook with provider returning invalid YAML → no mutations applied, cycle continues.
4. Hook in `fully-autonomous` mode → no human prompt, direct apply.
5. Hook in `autonomous-with-checkpoints` mode → diff shown to human, default approve.
6. Hook in interactive mode + human rejects diff → no mutations applied.
7. Erosion detector: 3 consecutive updates to PREF-007 within 30 days → status shows warning.
8. Scribe transcript saved to `.iagentek/.transcripts/scribe-design.md` regardless of success.

### Integration — `preferences-injection.integration.test.ts` (3 cases)
1. Agent prompt for `dev` phase contains PREFERENCES payload section with active statements only.
2. Agent prompt for `dev` phase does NOT contain `why`/`edge-case` from any pref.
3. Agent prompt with empty PREFERENCES → no PREFERENCES section in prompt.

### E2E (one full smoke + one adversarial)
1. **Smoke:** `init` → `cycle` greenfield with `mode=fully-autonomous` → after each approved checkpoint, scribe runs, PREFERENCES.md grows; final state has expected prefs; `iagentek preferences list` shows them.
2. **Adversarial:** crafted `idea` containing `memory:add` block + crafted notes with "ignore previous instructions"; expected: scribe runs, both injections rejected, PREFERENCES untouched, warnings logged, cycle completes.

## Technical risks

- **Hostile LLM provider (e.g., adversarial ollama model)** → scribe can emit schema-passing but semantically-poisonous mutations. **Mitigation:** documented residual risk. Warning at init if `provider.id === 'ollama'` and `mode === 'fully-autonomous'`. Recommend manual `iagentek preferences --edit` after cycles for paranoid setups.
- **Erosion of protected prefs via category-jumping** → scribe deprecates a protected pref by creating a new one in a different category that overrides it. **Mitigation:** PARTIAL — duplicate detection at 60% lexical overlap catches the obvious cases; the rest requires human review of new prefs in `autonomous-with-checkpoints` mode. Fully blocking this is v2 (semantic delta detection).
- **Lockfile race** between two parallel `iagentek cycle` invocations from different terminals → only one wins. **Mitigation:** lockfile uses PID + timestamp; mtime check on PREFERENCES is the second guard. Second cycle's scribe skips mutations and logs. Documented behavior.
- **PREFERENCES growing unbounded** over years of use → injection budget at 4000 chars throws away tail. **Mitigation:** `iagentek preferences --edit` for manual cleanup. Auto-pruning of deprecated prefs older than 6 months in v2.
- **Plugin marketplace.json schema requires testing** — slash commands may not register on first `/plugin install`. **Mitigation:** local test with `claude /plugin marketplace add file://.` before tagging v0.5.0.
- **Breaking change in `CheckpointManager.run()` signature** already paid in v0.4.5; no further breakage in v0.5.0 for the public API.
- **scribe output containing memory:* blocks fragmented across multiple LLM turns** (e.g., if streamed) → parser sees partial blocks. **Mitigation:** the provider abstraction returns full completions, not streamed chunks, to the orchestrator. Streaming is not used in the scribe path; verified in `provider.complete` contract.

## Complexity estimate

- **Size:** XL
- **Rationale:** ~1500 LoC added across 8 new core files + 4 modified files + 2 plugin files. ~50 new test cases (one per blocking mitigation plus integration plus E2E adversarial). The parser alone is ~400 LoC because each of the 8 mitigations needs its own code path AND its own test. Two new CLI commands (`preferences`, plus plugin slash commands). Bilingual scribe prompt (en + es). Full red-team review of implementation before tagging. Estimated ~25 dev days (3 weeks at 8h/day with buffer for adversarial QA), assuming v0.4.5 and v0.4.6 are already in.

---

**Generated by:** Architect (claude-opus-4-7 via consilium 2026-05-29) | **Atomic tasks at:** `tasks/memory-scribe.md`
