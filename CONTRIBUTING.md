# Contributing to Freshworks Marketplace Skills

Thank you for your interest in contributing to the Freshworks Marketplace Skills repository! This project provides AI coding assistant skills for building Freshworks Platform 3.0 marketplace applications.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Repository Structure](#repository-structure)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Submitting Changes](#submitting-changes)
- [Development Guidelines](#development-guidelines)
  - [Skill Structure](#skill-structure)
  - [Rule Files (.mdc)](#rule-files-mdc)
  - [Commands](#commands)
  - [References](#references)
- [Testing Your Changes](#testing-your-changes)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.MD). By participating, you are expected to uphold this code. Please report unacceptable behavior to devrels@freshworks.com.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/fw-dev-tools.git
   cd fw-dev-tools
   ```
3. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Repository Structure

```
fw-dev-tools/
├── .mcp.json                 # Bundled MCP: fw-dev-mcp (URL + Authorization)
├── .claude/                  # (gitignored) Local Claude Code project settings if you use them
├── .cursor/                  # (gitignored) Cursor IDE workspace state
│   └── rules/                # User-specific workspace rules (local, not versioned)
├── .claude-plugin/           # Claude Code plugin config
├── .cursor-plugin/           # Cursor plugin config
├── .codex-plugin/            # OpenAI Codex plugin manifest (skills + MCP pointers)
├── .agents/                  # (gitignored) Local IDE workspace state
│   └── plugins/              # Codex repo marketplace catalog (local, not versioned)
├── assets/                   # Dew logo (`fw-logo.svg`) for plugin manifests
├── docs/                     # Engine matrix, network requirements
├── skills/
│   ├── fw-app-dev/           # Core app development skill
│   │   ├── SKILL.md          # Main skill definition
│   │   ├── README.md         # Skill documentation
│   │   ├── commands/         # Slash commands (/fdk-fix, /fdk-migrate, etc.)
│   │   ├── references/       # Documentation loaded on-demand
│   │   └── assets/           # Templates and resources
│   ├── fw-ai-actions-app/    # AI Actions + third-party integrations (skill id: fw-ai-actions-app; actions.json, SMI)
│   ├── fw-review/            # Automated app review (rules + checks/ + runners/, structured report)
│   ├── fw-setup/             # FDK + Node install / lifecycle (nvm)
│   └── fw-publish/           # Marketplace publish (MCP) guidance
├── scripts/                  # Build and utility scripts
├── AGENTS.md                 # Agent entry point (routing + repo norms)
├── CODE_OF_CONDUCT.MD        # Community guidelines
└── README.md                 # Repository overview
```

## Shipped vs contributor specs

| Artifact | Shipped to IDE? | Path |
|----------|-----------------|------|
| Slim controller (Tier 1) | **Yes** — always loaded | `installer/src/specs/fw-dev-tools-spec.md` |
| Orchestration brain (Tier 2) | **Yes** — always loaded | `specs/agent-behaviour.md` (synced to `installer/src/specs/` on install) |
| Ecosystem map | **Yes** — via `~/.fw-dev-tools/specs/` | `specs/ecosystem-map.md` |
| `AGENTS.md` (repo root) | **No** — contributor routing inventory only | Never installed to end-user IDE paths |

End developers receive specs through `npx @freshworks/fw-dev-tools install` (Cursor rules, Claude `CLAUDE.md`, Codex `AGENTS.md`, and `~/.fw-dev-tools/specs/`).

## How to Contribute

When you add, remove, or rename files under any skill’s **`rules/`** or **`commands/`**, update the **Rules and slash commands (inventory)** section in **[`AGENTS.md`](AGENTS.md)** so Cursor / Claude **`rulesPath`** / **`commandsPath`** in **`.cursor-plugin/marketplace.json`** and **`.claude-plugin/marketplace.json`** stay aligned with what ships.

**FDK / Node version truth** should match **`docs/engine-matrix.md`** whenever you change toolchain guidance in **`skills/fw-setup/SKILL.md`**.

### Reporting Bugs

Use **[ISSUES.md](ISSUES.md)** at the repo root: the **mandatory issue body template** and checklists there are required for GitHub issues (see that file for details).

Before submitting:
1. Check existing [issues](https://github.com/freshworks-developers/fw-dev-tools/issues) to avoid duplicates
2. Use the latest version of the skills

When reporting bugs, include:
- **Clear title** describing the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs actual behavior
- **Environment details** (Cursor version, Claude Code / Codex if relevant, FDK version, Node.js version)
- **Error messages** or validation output if applicable
Beyond the mandatory template, a good report still has a **clear title**, **steps to reproduce**, and **expected vs actual** behavior.

### Suggesting Features

Feature requests are welcome! Please include:
- **Use case**: Why is this feature needed?
- **Proposed solution**: How should it work?
- **Alternatives considered**: Other approaches you've thought about

### Submitting Changes

We accept contributions for:
- Bug fixes
- New commands
- Documentation improvements
- New reference files
- Rule enhancements
- Template additions

## Development Guidelines

### Security and publish telemetry

See **[SECURITY.md](SECURITY.md)** for vulnerability reporting and for disclosure that `.meta.json` skill metrics are included in marketplace publish zips by design (platform ingestion; local file deleted after successful publish).

### Skill Structure

Each skill follows the Agent Skills Specification. In **this repo**, editor rules live under **`skills/<name>/rules/`** (not nested under **`skills/<name>/.cursor/rules`**). The Cursor skill bundle uses **`skills/<name>/.cursor-plugin/plugin.json`** with **`rulesDirectory`** / **`commandsDirectory`** pointing at **`./rules`** and **`./commands`** beside **`SKILL.md`**.

```
skill-name/
├── SKILL.md                 # Required: Main skill file with YAML frontmatter
├── README.md                # User-facing documentation
├── .cursor-plugin/
│   └── plugin.json          # rulesDirectory ./rules, commandsDirectory ./commands
├── commands/                # Optional: Slash commands (/fdk-fix, /fdk-migrate, …)
│   └── command.md           # One file per command
├── rules/                   # Optional: Cursor rules (.mdc) or fw-review audit rules (.md)
│   └── rule-name.mdc
├── references/              # Optional: On-demand documentation
│   ├── api/
│   ├── errors/
│   └── ...
└── assets/                  # Optional: Templates, icons
    └── templates/
```

### SKILL.md Format

```markdown
---
name: skill-name
description: Brief description of what the skill does and when to use it
compatibility: Platform versions, FDK versions, Node versions
---

# Skill Title

Instructions and content for the AI assistant...
```

### Rule Files (.mdc)

Cursor rules use `.mdc` format with YAML frontmatter:

```markdown
---
name: rule-name              # Must match filename (without .mdc)
description: What this rule covers
globs: ["**/pattern/*.js"]   # Optional: Auto-trigger on file patterns
alwaysApply: true            # true = always loaded, false = on-demand
---

# Rule Content

Detailed instructions, patterns, and examples...
```

**Naming convention**: The `name` field must match the filename:
- File: `my-rule.mdc` → `name: my-rule`

### Commands

Commands are markdown files in `commands/` directory:

```markdown
# Command Name

Brief description of what the command does.

## Step 1: First Step

Instructions...

## Step 2: Second Step

Instructions...
```

**Command naming**:
- Filename becomes the command: `migrate.md` → `/migrate`
- Use lowercase with hyphens for multi-word commands

### References

Reference files provide detailed documentation loaded on-demand:

```
references/
├── api/                    # API documentation
│   ├── request-method-docs.md
│   └── oauth-docs.md
├── errors/                 # Error handling guides
│   ├── manifest-errors.md
│   └── oauth-errors.md
├── architecture/           # Platform architecture docs
└── tests/                  # Test patterns (refusal / violations)
    ├── refusal.json
    └── violations.json
```

## Testing Your Changes

See **[tests/TESTING.md](tests/TESTING.md)** for the full test suite guide — especially **When to run which layer** (change-type → required layers). Summary:

### Layer 1 — Installer tests (required when `installer/` changes, runs in CI)

```bash
cd installer && npm install && npm test
```

Install/update/uninstall lifecycle, MCP merge, meta scripts, and IDE-specific installers.

### Layer 2 + 3 — Static + regex evals (required, runs in CI)

```bash
cd tests && npm install && npm test
```

215 static/parser assertions plus 141 regex eval scenarios across all skill files — no LLM, no API key. Must pass before opening a PR.

### Layer 4 — LLM behavioral evals (required for skill edits, local only)

```bash
cd tests && npm run eval
```

Or via the unified runner:

```bash
bash tests/run-all-tests.sh --llm-eval
```

Requires `claude` or `cursor` on PATH (subscription auth — no `ANTHROPIC_API_KEY` needed). Or, in **Claude Code or Cursor**, ask: *"Run the skill evals"*.

**Attach `tests/all-tests-report.html` to your PR.** Required for any PR that modifies a `SKILL.md`, command file, or `.meta.template.json`. Maintainers may also trigger **[CI](https://github.com/freshworks-developers/fw-dev-tools/actions/workflows/ci.yml)** with **Run skill evals** checked (`workflow_dispatch`) for on-demand reports — supplemental to local runs, not a PR gate.

### PR checklist

Every PR should satisfy the checklist in `.github/PULL_REQUEST_TEMPLATE.md` (auto-populated when you open a PR on GitHub):

- [ ] `cd tests && npm test` passes locally (no LLM)
- [ ] For skill edits: existing eval scenarios reviewed and updated if needed, new scenarios added for new behavioral rules, evals run and passing
- [ ] `tests/all-tests-report.html` attached to the PR

### Writing new static tests — cross-platform rules

The CI workflow runs on Linux; contributors may be on macOS or Windows. Any new test added to `skill-static.test.js` must follow these rules:

- **Use `grepFiles()`** — the pure-Node helper already in the file — instead of shell `grep`. BSD `grep` (macOS) lacks `--exclude-dir`; Windows has no `grep` at all.
- **Guard bash invocations** with `{ skip: process.platform === 'win32' }` if a test runs a `.sh` script.
- **No Unix-only CLI flags** (`find -exec`, `chmod`, etc.) — use `node:fs` APIs.
- **Paths via `join()`** — never string-concatenate with `/`.

### 0. Docs hygiene (optional, recommended)

```bash
python3 scripts/check-internal-links.py
bash scripts/check-marketplace-versions.sh
```

### Smoke-test in Cursor / Claude Code / Codex (optional)

Run the installer against your branch and verify the skills load in your IDE:

```bash
npx @freshworks/fw-dev-tools install
```

Then type `/fw-setup-` in chat — autocomplete should list available commands. For **fw-publish**, confirm MCP is configured per **[AGENTS.md](AGENTS.md)**.

### Validate Rule Files

For rule files, verify:
- `name` field matches filename
- `alwaysApply` is set correctly
- `globs` patterns are valid (if used)

## Pull Request Process

1. **Ensure your changes are complete** and tested locally
2. **Update documentation** if you're changing behavior (**AGENTS.md** skill inventory if **rules/** or **commands/** changed; **docs/engine-matrix.md** if toolchain pins changed)
3. **Run docs hygiene** (`check-internal-links.py`, **`check-marketplace-versions.sh`**) if you touched umbrella plugin JSON (`.cursor-plugin/`, `.claude-plugin/`, `.codex-plugin/`, `.agents/plugins/`) or docs with many links
4. **Create a pull request** with:
   - Clear title describing the change
   - Description of what and why
   - Link to related issues (if any)
   - Screenshots or examples (if applicable)

5. **Address review feedback** promptly
6. **Squash commits** if requested before merge

### PR Title Format

Use conventional commit style:
- `feat: add new /lint command`
- `fix: correct OAuth template structure`
- `docs: update README with examples`
- `refactor: simplify validation workflow`

## Style Guidelines

### Markdown

- Use ATX-style headers (`#`, `##`, `###`)
- Use fenced code blocks with language tags
- Keep lines under 120 characters when possible
- Use consistent list formatting (either `*` or `-`, not both)

### Code Examples

- Always include language tags in code blocks
- Use Platform 3.0 patterns only (no legacy 2.x code)
- Include comments for complex logic
- Show both correct and incorrect examples where helpful:
  ```javascript
  // ❌ WRONG
  $request.post(url, options);

  // ✅ CORRECT
  $request.invokeTemplate('templateName', { context, body });
  ```

### JSON

- Use 2-space indentation
- No trailing commas
- Keys in logical order (platform-version, modules, engines)

### Rule Content

- Start with clear "When to use" guidance
- Use tables for quick reference
- Include concrete examples
- Mark blocking vs non-blocking issues clearly

## Security

When contributing examples or documentation:
- **Never include real API keys, tokens, or secrets**
- Use placeholders like `<%= iparam.api_key %>` or `your-api-key-here`
- Use generic domains like `your-domain.freshdesk.com`
- Mark sensitive iparams with `"secure": true` in examples

---

## Questions?

- Check existing [issues](https://github.com/freshworks-developers/fw-dev-tools/issues) and discussions
- Review the [Freshworks Developer Docs](https://developers.freshworks.com/)
- Contact devrels@freshworks.com for additional support

Thank you for contributing!
