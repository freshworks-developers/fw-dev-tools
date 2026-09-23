<h1 align="center">FDK Setup</h1>

<p align="center"><strong>Platform 3.0 Development - FDK 10.x (recommended) & FDK 9.x (deprecated)</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-3.0-blue?style=for-the-badge" alt="Platform 3.0">
  <img src="https://img.shields.io/badge/Cursor-Plugin-00a67e?style=for-the-badge" alt="Cursor Plugin">
  <img src="https://img.shields.io/badge/FDK-10.x_|_9.x-0052cc?style=for-the-badge" alt="FDK">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-24.x_(recommended)-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 24.x">
  <img src="https://img.shields.io/badge/Node.js-18.x_(deprecated)-orange?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 18.x">
  <img src="https://img.shields.io/badge/macOS-Supported-000000?style=flat-square&logo=apple&logoColor=white" alt="macOS">
  <img src="https://img.shields.io/badge/Windows-Supported-0078D6?style=flat-square&logo=windows&logoColor=white" alt="Windows">
</p>

<p align="center">Manual commands for FDK lifecycle management on macOS and Windows.<br>Install, upgrade, downgrade, and uninstall FDK using <strong>subagents</strong> with <strong>nvm</strong>.</p>

<p align="center"><code>Platform 3.0</code> · <code>FDK 10.x Recommended</code> · <code>FDK 9.x Allowed</code> · <code>Publishing Requires FDK 10.x</code></p>

> **FDK VERSION SUPPORT**: 
> - **FDK 10.x + Node 24.x** (Recommended) - Required for publishing, supported until Dec 2027
> - **FDK 9.x + Node 18.x** (Deprecated) - Allowed for development only, ends May 31, 2026

> **PLATFORM 3.0 ONLY**: Platform 2.3 is deprecated. Both FDK versions support Platform 3.0.

> **IMPORTANT**: Run **`/fw-setup-install`** (or legacy **`/fdk-install`**) before creating Freshworks apps. This skill does NOT auto-check prerequisites on generic “create app” prompts.

## Overview

**fw-setup** installs and manages the Freshworks Development Kit (**FDK**) and **Node.js** via **nvm** on macOS, Windows, and Linux. Use it when the CLI is missing, the wrong major version, or broken across shells; marketplace publishing expects **FDK 10.x** on **Node 24.x**. Other skills in this repo: **fw-app-dev**, **fw-build-your-mcp-server**, **fw-review**, **fw-publish** — inventory **[AGENTS.md](../../AGENTS.md)**.

**Homebrew vs Chocolatey vs CDN (quick analogy)**  

- **Default in this repo:** **`nvm`/`nvm-windows` + CDN tarball** — matches **`docs/engine-matrix.md`**, best for multiple Node/FDK stacks and repeatable installs (**`skills/fw-setup/SKILL.md`** *Why CDN + nvm is default*).
- **Optional:** **`brew install fdk`** (macOS) or **`choco install fdk`** (Windows) — system-wide installers; simpler for “one laptop, one toolchain,” documented under **`references/macos.md`** (Option B Homebrew), **`references/windows.md`**, and **`references/cross-platform-scenarios.md`**. **`/fw-setup-install`** can detect brew/choco when installed that way.
- **Windows (MSI / winget / Store / Chocolatey Node):** Multiple **`node.exe`** sources often break **`nvm use 24.11`** visibility—see **`references/windows.md`** *Installer-based setups* (PATH diagnostics, **two `fdk`** shims, cleanup order).
## Rules and slash commands (files)

- **Rules:** `rules/fdk-enforcement.mdc`
- **Commands:** `/fw-setup-install` … `/fw-setup-use` → `commands/fw-setup-*.md` (seven files; command name matches filename stem)

Canonical table: repository [`AGENTS.md`](../../AGENTS.md) → **Rules and slash commands (inventory)** → **fw-setup**.

## Install

### Install via CLI:

```bash
npx @freshworks/fw-dev-tools install
```

### Install as Claude Plugin

**Step1**

```bash
claude plugin marketplace add freshworks-developers/fw-dev-tools
```

**Step2**

```bash
claude plugin install fw-setup@freshworks-developers
```

## Verify Installation

The plugin should appear in Cursor/Claude Settings → Plugins → Installed Plugins.

Check available commands:
```bash
# In Cursor/Claude chat, type:
/fw-setup-
# You should see 7 commands in autocomplete
```

## FDK Version Support Policy

**Platform 3.0 Development:** Both FDK 10.x and FDK 9.x work with Platform 3.0.

### FDK 10.x + Node 24.x (Recommended)
- **Status:** Active, supported until December 2027
- **Use for:** All new development
- **Publishing:** Required for marketplace submission
- **Command:** `/fw-setup-install` (default)

### FDK 9.x + Node 18.x (Deprecated)
- **Status:** Deprecated, support ends May 31, 2026
- **Use for:** Development only (legacy projects)
- **Publishing:** NOT SUPPORTED
- **Command:** `/fw-setup-downgrade` (shows deprecation warning)
- **Warning:** Automatic prompt before installation

### Platform 2.3 (Rejected)
- **Status:** Deprecated, no support
- **This skill:** Platform 3.0 ONLY

## Usage

### Manual Commands (Always Work)

**You must explicitly run these commands:**

```bash
/fw-setup-install              # Install FDK 10.x + Node 24 (recommended)
/fw-setup-install --version 10.1.0  # Pin FDK 10.x.y (CDN v10.1.0.tgz)
/fw-setup-upgrade              # Upgrade to latest FDK 10.x line (Node 24.11)
/fw-setup-upgrade --to 10.1.0 # Pin semver (CDN v10.1.0.tgz)
/fw-setup-downgrade            # FDK 9.x latest line + Node 18 (deprecated)
/fw-setup-downgrade 10.0.1     # Downgrade within FDK 10.x line (e.g., 10.1.0 → 10.0.1, stays on Node 24)
/fw-setup-downgrade 9.6.0      # Pin FDK 9.x.y (CDN v9.6.0.tgz, switches to Node 18)
/fw-setup-uninstall            # Remove FDK only (npm + ~/.fdk + cache; keeps nvm)
/fw-setup-status               # Inline status
/fw-setup-status --verbose     # PATH, npm prefix, nvm, rc snippets
/fw-setup-troubleshoot         # Diagnose (inline)
/fw-setup-troubleshoot --fix   # Shell Task: zshrc-safe nvm + FDK 10.x on 24.11
/fw-setup-use                  # Workspace: nvm use + .nvmrc (FDK 10.x vs 9); optional --write-nvmrc
# Legacy: /fw-setup-install, /fw-setup-upgrade, /fw-setup-downgrade, /fw-setup-uninstall, /fw-setup-status
```

**Local dev (background, not a slash command):** from your app directory (where `manifest.json` lives), run the script by absolute path, for example:

`bash /path/to/fw-dev-tools/skills/fw-setup/scripts/fw-setup-run-background.sh`

Logs and a PID file go under `${TMPDIR:-/tmp}/fw-setup-runs/` unless `FDK_RUN_LOG_DIR` is set. To signal matching `fdk run` / `fdk tunnel` processes: `bash .../scripts/fw-setup-stop-shell-tasks.sh` (`--dry-run`, `--force`).

### Key Features

**Install (`/fw-setup-install`):**
- Installs FDK 10.x with Node.js 24.11 via nvm + CDN (default **latest-v24.tgz**)
- Optional **`--version X.Y.Z`** pins **`vX.Y.Z.tgz`** (FDK **10.x.y** only; refuse 9.x here)
- Auto-detects existing Node installations
- Sets up global persistence across all terminals
- Comprehensive verification in new shells

**Upgrade (`/fw-setup-upgrade`):**
- Upgrades to latest FDK 10.x line, or **`--to X.Y.Z`** for a pinned release (`https://cdn.freshdev.io/fdk/vX.Y.Z.tgz`)
- Complete uninstall of previous version before upgrade
- Removes ~/.fdk directory to prevent conflicts
- Preserves Node 24 configuration

- Moves from FDK 9.x + Node 18 to FDK 10.x + Node 24.11 (keeps Node 18 in nvm)

**Downgrade (`/fw-setup-downgrade`):**
- Downgrades from FDK 10.x to FDK 9.x (Node 24 → Node 18)
- Optional **pinned 9.x.y** (`v9.x.y.tgz`) or **latest** 9 line (`latest.tgz`) after HTTP check
- Shows deprecation warning (FDK 9.x ends May 31, 2026)
- Requires confirmation before proceeding
- Complete cleanup of FDK 10.x before installing 9.x
- Warns that publishing requires FDK 10.x
- Use for development only

**Uninstall (`/fw-setup-uninstall`):**
- Complete removal: npm package + binary + node_modules
- Removes ~/.fdk directory completely
- Cleans npm cache to prevent reinstall issues
- Removes shell config references (with backup)
- Manual binary removal if npm uninstall fails
- Comprehensive verification of complete removal
- **No `uninstall --all`** — Node and nvm are never removed by this skill

**Status / troubleshoot:**
- **`/fw-setup-status --verbose`** — extended diagnostics (still inline, no Task)
- **`/fw-setup-troubleshoot`** — diagnose PATH / nvm / FDK (inline)
- **`/fw-setup-troubleshoot --fix`** — shell Task with conservative **`~/.zshrc`** / **`~/.bashrc`** edits

**Use (`/fw-setup-use`) — workspace stack (inline):**
- **`nvm use`** from **`.nvmrc`** or explicit **10** / **9** (Node **24.11** vs **18**)
- Optional **`--write-nvmrc`** to pin **`24.11`** (FDK 10.x) or **`18`** (FDK 9.x) in the app repo
- Does not change global default alias by itself; switches the **active shell** (and documents next steps if **`fdk`** is missing on that Node)

### ⚠️ IMPORTANT: Run Before Creating Apps

**Before creating any Freshworks app, you MUST run:**
```bash
/fw-setup-install
```

**Why?** Cursor does not automatically check for FDK prerequisites. If you skip this step and try to create an app, the agent may create files manually without proper validation.

### When Agent Might Auto-Invoke

The agent *may* automatically load this skill when you explicitly mention:
- "install fdk"
- "setup fdk"
- "check fdk status"

**However:** If you just say "create a freshdesk app", the agent may skip the FDK check. Always run **`/fw-setup-install`** first.

## How It Works

### Command Flow (Manual Invocation)

```
User types: /fw-setup-install
    ↓
Cursor reads: commands/fw-setup-install.md
    ↓
Command reads: SKILL.md (operation template)
    ↓
Creates: Task tool with shell subagent
    ↓
Subagent receives: Full context (what FDK is, requirements, etc.)
    ↓
Subagent executes: Multi-step installation workflow
    ↓
Returns: Installation status and next steps
```

**Key Point:** This flow ONLY works when you explicitly type the slash command. It does NOT automatically trigger when you request app creation.

### Subagent Workflow

When you run a command (e.g., `/fw-setup-install`), it spawns a **dedicated shell subagent** that:

1. **Auto-detects environment** - OS, Node.js, package managers (Homebrew/Chocolatey)
2. **Smart decision-making** - Chooses best installation method automatically
3. **Asks only when needed** - User input only for meaningful choices
4. **Installs/manages** - FDK and Node.js via optimal method
5. **Preserves existing** - Never removes user's Node versions
6. **Verifies setup** - Tests all components work correctly
7. **Reports status** - Comprehensive output with next steps


**Benefits:**
- Autonomous execution (minimal user intervention)
- Smart auto-detection (Homebrew/Chocolatey/nvm)
- Isolated error handling
- Progress tracking

**Limitation:**
- Only works when YOU explicitly invoke commands
- Does NOT automatically check FDK before app creation
- You must remember to run **`/fw-setup-install`** first

## What's Included

### Core Files

```
fw-setup/
├── SKILL.md                   # Main skill logic and operation templates
├── README.md                  # This file
│
├── .cursor-plugin/
│   └── plugin.json            # Command registration for Cursor
│
├── .claude-plugin/
│   └── plugin.json            # Command registration for Claude Code
│
├── commands/                  # Slash command definitions (/fw-setup *)
│   ├── fw-setup-install.md   # optional --version
│   ├── fw-setup-upgrade.md   # optional --to
│   ├── fw-setup-downgrade.md # optional 9.x.y pin
│   ├── fw-setup-uninstall.md
│   ├── fw-setup-status.md    # optional --verbose
│   ├── fw-setup-troubleshoot.md  # optional --fix
│   └── fw-setup-use.md           # workspace nvm / .nvmrc
│
├── scripts/
│   ├── fw-setup-run-background.sh  # nohup fdk run … (returns immediately)
│   ├── fw-setup-stop-shell-tasks.sh # SIGTERM matching fdk run / fdk tunnel (optional --force)
│   └── detect-install-method.sh     # Helper script for install method detection
│
├── rules/
│   └── fdk-enforcement.mdc   # IDE rules for FDK enforcement
│
└── references/                # Loaded by SKILL.md on-demand
    ├── cross-platform-scenarios.md  # Multi-method install detection & migration
    ├── cross-scenarios.md           # Detailed subagent specifications
    ├── error-command-not-found.md   # Troubleshooting fdk command not found
    ├── interactive-troubleshooting-guide.md  # Manual phased troubleshooting
    ├── macos.md                     # macOS-specific details (nvm, Homebrew)
    ├── node-version-sop.md          # Manual SOP for Node version switching
    ├── npm-permissions-sop.md       # EACCES and global prefix issues
    ├── nvm-install-sop.md           # Manual nvm installation SOP
    ├── real-world-scenarios.md      # Real-world testing scenarios
    ├── shell-persistence-sop.md     # Shell persistence and rc file configuration
    ├── version-policy.md            # FDK version policy and CDN URLs
    └── windows.md                   # Windows-specific details (nvm-windows, PATH)
```

### Command Registration

Commands are registered in `plugin.json`:

```json
{
  "commands": [
    {
      "name": "fw-setup-install",
      "description": "Install FDK 10.x + Node 24",
      "file": "commands/fw-setup-install.md"
    }
  ]
}
```

Claude Code/Cursor reads `plugin.json` to discover and register slash commands.

### Key Features

- **Smart Auto-Detection** - Detects Homebrew/Chocolatey, Node versions, asks only when needed
- **Subagent Execution** - Mutating commands use shell Tasks; **`/fw-setup-status`**, **`/fw-setup-troubleshoot`** (no **`--fix`**), and **`/fw-setup-use`** are inline
- **Version Isolation** - Uses nvm to preserve existing Node versions
- **Error Recovery** - Automatic retry and fallback strategies
- **Cross-Platform** - macOS (Homebrew), Windows (Chocolatey), Linux (nvm)

## Requirements

- **Cursor IDE** or **Claude Code**
- **nvm** (installed automatically on macOS/Linux)
- **nvm-windows** (manual install required on Windows)
- **Node.js 24.0.0+** (installed automatically via nvm)

## Support

- 📖 [Freshworks Developer Docs](https://developers.freshworks.com/)
- 🐛 [Report Issues](https://github.com/freshworks-developers/fw-dev-tools/issues)

## License

MIT
