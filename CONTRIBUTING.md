# Contributing to IAgentek

Thanks for considering contributing to IAgentek. This guide takes you from clone to mergeable PR in under 15 minutes.

## TL;DR
```bash
git clone https://github.com/azulls1/iagentek-framework
cd iagentek-framework
npm install
npm run build
npm test
```

If the 4 commands pass, your environment is ready.

---

## Detailed setup

### Requirements
- **Node.js >= 18.17.0** (tested on 18, 20, 22)
- **npm >= 9** (bundled with modern Node)
- **Git** (any recent version)
- Optional: **Claude Code CLI** or an API key from some provider to test the cycle end-to-end

### Monorepo structure
```
iagentek-framework/
├── packages/
│   ├── method/    # @iagentek/method — BMAD agents + SDD templates + flows (markdown assets)
│   ├── core/      # @iagentek/core — providers, orchestrator, checkpoints, state
│   └── cli/       # @iagentek/cli — bin/iagentek.js, commands init/cycle/status/resume/agent
├── iagentek-plugin/ # Claude Code plugin (slash commands + native agents)
├── scripts/       # Build/publish scripts
├── .github/       # CI, issue templates
└── root docs:     # README, ARCHITECTURE, CHANGELOG, PUBLISHING, etc.
```

### Build order (important)
Packages have dependencies among themselves: `cli → core → method`. The `npm run build` script compiles them in the correct order. If you build manually one by one, respect this order.

---

## Workflow for a change

### 1. Issue first (recommended)
Before investing time on a big change, open an issue to align on scope. Small changes (bugfix, typo, minor improvement) go straight to PR.

### 2. Branch
```bash
git checkout -b fix/short-descriptive-slug
# or
git checkout -b feat/short-descriptive-slug
```

### 3. Code
- If you add a BMAD agent: create the `.md` in `packages/method/assets/agents/` AND add the entry in the `AgentRole` type at `packages/method/src/index.ts`.
- If you add an AI provider: implement `AIProvider` in `packages/core/src/providers/`, register it in `factory.ts`, add detection in `detect.ts`, export from `index.ts`.
- If you add a flow: create the `.yaml` in `packages/method/assets/flows/`. The orchestrator loads it automatically.

### 4. Tests
Tests live in `packages/<package>/test/`. We use Vitest. Minimum:
- Unit test for the new code
- If you touch the orchestrator, an integration test with a mock provider

```bash
npm test                  # run all tests
npm run test:watch        # watch mode
```

### 5. Local build
```bash
npm run build
```
Must pass without errors before merging (CI blocks otherwise).

### 6. CLI smoke test
```bash
node packages/cli/dist/bin/iagentek.js --help
node packages/cli/dist/bin/iagentek.js init demo --provider claude-cli --cwd /tmp/iagentek-test
```

### 7. Commit
- Messages in imperative present tense: "add", "fix", "remove", not "added"/"fixed".
- One idea per commit. If your PR has 7 independent changes, 7 commits.

### 8. PR
Follow the template (`.github/PULL_REQUEST_TEMPLATE.md`). Include:
- What changed and why
- How to test it
- Screenshots if applicable
- Issue it closes (if any)

---

## Code style

### TypeScript
- `strict: true` already set in `tsconfig.base.json` — non-negotiable.
- No `any` unless justified with a comment.
- Prefer `interface` over `type` for public object shapes.
- Relative imports end in `.js` (ESM with NodeNext).

### Markdown
- Blank line before and after code blocks.
- No decorative emojis unless the README asks for them.
- Headings in sentence case (`## My heading`, not `## My Heading`).

### BMAD agents (prompts in `packages/method/assets/agents/`)
- Start with `# Agent: <Name>`.
- Required sections: **Identity**, **Principles**, **Expected inputs**, **Your process**, **Outputs**, **Checkpoint**, **What NOT to do**.
- Direct, opinionated tone — the agent is an expert, not a neutral assistant.

---

## Running the CLI with local changes

```bash
# After a build
npm link -w @iagentek/cli

# Now `iagentek` is globally available pointing to your local copy
iagentek --version
iagentek init test-local
```

To undo:
```bash
npm unlink -g @iagentek/cli
```

---

## Reporting bugs

1. Verify there isn't already a similar open issue.
2. Use the "Bug report" template in `.github/ISSUE_TEMPLATE/`.
3. Include Node version, OS, command output, what you expected vs what happened.

## Proposing features

1. Open a "Feature request" issue before coding.
2. Describe the problem it solves, not the solution you imagine.
3. If it affects an existing BMAD agent or flow, justify why the change doesn't break the SDD promise (specs as contract).

---

## Code of conduct

This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md). By contributing, you agree to honor it.

## License

By submitting a PR, you agree your contribution is published under [MIT](./LICENSE).
