# Security policy

## Supported versions

Only the latest published minor version on npm receives security patches.

| Version | Supported |
|---|---|
| 0.3.x | ✅ |
| < 0.3 | ❌ |

## Reporting a vulnerability

**Do not open a public issue for security vulnerabilities.**

Send an email to **azull.samael@gmail.com** with:
- Description of the problem
- Steps to reproduce
- Estimated impact (what could be compromised)
- Affected version
- If applicable: minimal PoC

### What to expect

- **Acknowledgement:** within 72 hours.
- **Initial assessment:** within 7 days.
- **Disclosure coordination:** we agree on a window to patch before public disclosure.

### Ground rules

- Do not exploit the vulnerability beyond what is necessary to demonstrate it.
- Do not access third-party data.
- If you find a leaked secret, do not use it — report it.

## Scope

This policy covers:
- The 3 npm packages: `@iagentek/cli`, `@iagentek/core`, `@iagentek/method`
- The Claude Code plugin in `iagentek-plugin/`
- Repo scripts (`scripts/`)

**Out of scope:**
- Vulnerabilities in upstream dependencies (report them to the corresponding project; we update once a patch is published).
- Behavior misconfigured by the user (e.g., committing `.env` to the repo).
- Vulnerabilities requiring prior physical or local root access.

## Acknowledgments

If your report results in a patch, we'll list you in the `CHANGELOG.md` unless you prefer to remain anonymous.
