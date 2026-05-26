---
description: Run the full IAgentek cycle with checkpoints (reads project config)
argument-hint: [--flow greenfield|brownfield|bugfix|refactor] [--idea "..."]
---

Run `npx @iagentek/cli cycle $ARGUMENTS` with the Bash tool in the current directory.

Before running:
1. Verify that `.iagentek/config.yaml` exists — if not, suggest running `/iagentek-init` first.
2. If the user didn't pass `--idea` and the project lacks `.iagentek/project-brief.md`, ask for the product idea in 1-3 sentences with AskUserQuestion.

After the cycle:
- If it completed fully, suggest `/iagentek-status` to see the summary.
- If it paused at a checkpoint, tell the user which file to review and how to resume with `/iagentek-resume`.
