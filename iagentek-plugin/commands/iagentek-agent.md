---
description: Invoke a single BMAD agent in isolation (analyst, pm, architect, scrum-master, dev, qa, devops, debugger, refactor-architect)
argument-hint: <role> [--prompt "extra instruction"]
---

Run `npx @iagentek/cli agent $ARGUMENTS` with the Bash tool in the current directory.

If the user did not specify a role, first ask via AskUserQuestion which BMAD agent to use:
- analyst (discovery, problem)
- pm (PRD, specs)
- architect (stack, design)
- scrum-master (stories, tasks)
- dev (implementation)
- qa (validation)
- devops (CI/CD, release)
- debugger (bugs, incidents)
- refactor-architect (tech debt)

Then ask whether they want to add an extra instruction to the project context, or whether the current context is enough.
