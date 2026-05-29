# Smoke Test Procedure — v0.4.5

Manual end-to-end smoke executed once before publishing the release. Run from a clean sandbox directory (NOT the iagentek-framework repo itself).

## Prerequisites

- Node ≥ 18.17.0.
- `@iagentek/cli@0.4.5` built locally OR an LLM provider configured (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `claude-cli` in `PATH`).
- A throwaway directory: `mkdir /tmp/iagentek-smoke-045 && cd /tmp/iagentek-smoke-045` (or equivalent on Windows: `New-Item -ItemType Directory -Path $env:TEMP\iagentek-smoke-045 && Set-Location ...`).

## Scenario A — Fresh project, happy path (no crash)

```bash
node /path/to/iagentek-framework/packages/cli/dist/bin/iagentek.js init smoke-app
node /path/to/iagentek-framework/packages/cli/dist/bin/iagentek.js cycle --idea "A small TODO REST API with auth"
# Approve the first checkpoint (discovery). Then immediately stop with Ctrl-C.
```

**Expected after Ctrl-C:**
- `.iagentek/state.json` exists, is valid JSON, contains `"discovery"` in `completedPhases`.
- No `state.json.*.tmp` files in `.iagentek/`.

## Scenario B — Crash recovery via reconcile

```bash
# Continue from Scenario A's directory.
# Manually corrupt state to simulate the legacy gap (approve recorded, phase not completed):
node -e "
  const fs = require('fs');
  const p = '.iagentek/state.json';
  const s = JSON.parse(fs.readFileSync(p,'utf-8'));
  // Add an approved checkpoint for the NEXT phase but don't add it to completedPhases.
  s.checkpoints.push({ id: 'specs-approved', approvedAt: new Date().toISOString(), notes: 'pretend crash' });
  fs.writeFileSync(p, JSON.stringify(s, null, 2));
"

node /path/to/iagentek-framework/packages/cli/dist/bin/iagentek.js resume
```

**Expected:**
- Log line: `⤴ Reconciling 'Product Definition (PRD + Specs)': checkpoint approved but phase was not marked complete (likely crash recovery).`
- No LLM call for the `definition` phase (no token spend).
- Cycle continues from the next phase (`architecture`) normally.

## Scenario C — Transcript reuse <24h

```bash
# Start a fresh project, run cycle, but kill the process AFTER the LLM responds
# and BEFORE you approve the checkpoint. The transcript is on disk already.

node /path/to/iagentek-framework/packages/cli/dist/bin/iagentek.js init reuse-test
node /path/to/iagentek-framework/packages/cli/dist/bin/iagentek.js cycle --idea "Hello world API"
# Wait until you see "📝 Artifacts generated:" — the LLM responded.
# Press Ctrl-C BEFORE approving the checkpoint.

ls .iagentek/.transcripts/discovery.md     # should exist
node /path/to/iagentek-framework/packages/cli/dist/bin/iagentek.js resume
```

**Expected:**
- Log line: `♻ Reusing transcript from Xs ago for 'Discovery & Problem Definition' (skip LLM call).`
- The checkpoint prompt appears immediately — no LLM call delay.
- Approving completes the phase normally.

## Scenario D — Path with spaces

```powershell
# Windows PowerShell
$dir = "$env:TEMP\iagentek smoke with spaces 045"
New-Item -ItemType Directory -Path $dir -Force | Out-Null
Set-Location $dir
node C:\path\to\iagentek-framework\packages\cli\dist\bin\iagentek.js init "spacey-app"
```

**Expected:**
- `init` completes successfully.
- `.iagentek/state.json` is valid JSON.
- Path with spaces does not break atomic write (rename tolerates them).

## Scenario E — Concurrent crash recovery doesn't waste tokens

```bash
# After running Scenario C successfully, run resume AGAIN immediately.
node /path/to/iagentek-framework/packages/cli/dist/bin/iagentek.js resume
```

**Expected:**
- No `♻ Reusing transcript` for the now-completed `discovery` phase (it was completed last time and is skipped).
- The cycle continues from the next unfinished phase.

## Verification checklist

- [ ] Scenario A: state.json valid JSON, no orphan .tmp files.
- [ ] Scenario B: `⤴ Reconciling` log appears, no LLM call for the reconciled phase.
- [ ] Scenario C: `♻ Reusing transcript` log appears, no LLM call delay on resume.
- [ ] Scenario D: path with spaces works on Windows.
- [ ] Scenario E: completed phases are skipped (no reuse, no re-call).
- [ ] All four checkpoints in a full greenfield cycle complete without error.

If any scenario fails: **do not publish**. File an issue and revert the version bump.

---

Generated as part of `STORY-007` / `tasks/memory-bugfixes.md#task-15`.
