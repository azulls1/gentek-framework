---
name: 🐛 Bug report
about: Report unexpected behavior or a crash
title: "[Bug] "
labels: bug, needs-triage
assignees: ''
---

## Summary
<!-- 1-2 sentences describing the bug -->

## Steps to reproduce
1. I ran `...`
2. I did `...`
3. I saw `...`

## Expected behavior
<!-- What you expected to happen -->

## Actual behavior
<!-- What actually happened. Paste the full command output if applicable. -->

```
[command output]
```

## Environment
- **IAgentek version:** (output of `npx @iagentek/cli --version`)
- **Provider used:** anthropic / claude-cli / openai / ...
- **Node.js:** (output of `node --version`)
- **npm:** (output of `npm --version`)
- **OS:** Windows / macOS / Linux (specify version)
- **Flow:** greenfield / brownfield / bugfix / refactor

## Relevant files (if applicable)
- Contents of `.iagentek/config.yaml` (without secrets)
- Contents of `.iagentek/state.json`
- Transcripts in `.iagentek/.transcripts/` showing the failure

## Checklist
- [ ] I verified there isn't another open issue for this bug
- [ ] I reproduced the bug in a clean version (no local modifications)
- [ ] I removed sensitive info (API keys, private data) from the report
