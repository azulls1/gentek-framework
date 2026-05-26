---
description: Bootstrap IAgentek in a project (greenfield or brownfield)
argument-hint: [project-name] [--flow greenfield|brownfield]
---

Run `npx @iagentek/cli init $ARGUMENTS` in the current directory using the Bash tool.

If the user passed no arguments, first ask via AskUserQuestion:
1. Project name (or "." if you're already in the folder)
2. Initial flow: greenfield, brownfield, bugfix, refactor
3. AI provider: claude-cli, anthropic, openai, gemini, deepseek, ollama

After running the command, show the suggested next steps:
- `cd <name>` if a subdirectory was created
- `/iagentek-cycle` to start the cycle
- `/iagentek-status` to see current state
