<h1 align="center">Freshworks Agentic Developer Toolkit</h1>

<p align="center"><strong>AI-powered toolkit for building Freshworks apps in Claude Code, Cursor, and OpenAI Codex</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-3.0-blue?style=for-the-badge" alt="Platform 3.0">
  <img src="https://img.shields.io/badge/Cursor-Skill-00a67e?style=for-the-badge" alt="Cursor Skill">
  <img src="https://img.shields.io/badge/Crayons-4.x-00a67e?style=for-the-badge" alt="Crayons">
  <img src="https://img.shields.io/badge/FDK-10.x-0052cc?style=for-the-badge" alt="FDK">
  <img src="https://img.shields.io/badge/Node.js-24.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
</p>

<p align="center">Build Freshworks marketplace apps faster with AI assistance.<br>Supports <strong>Platform 3.0</strong> with modern best practices.</p>

<p align="center"><code>Platform 3.0</code> · <code>Cursor Plugins</code> · <code>Crayons</code> · <code>Request Templates</code> · <code>OAuth</code> · <code>fdk validate</code></p>

## Contents

| Section | Purpose |
|---------|---------|
| [What You Can Do](#what-you-can-do) | Capability overview |
| [Installation](#installation) | One command for Cursor, Claude Code, and Codex |
| [Prerequisites](#prerequisites) | Before you run **`fdk`** or publish |
| [Available Tools](#available-tools) | Five skills at a glance |
| [Workflow](#step-by-step-workflow) | Idea → validated app → publish |
| [MCP (publish)](#mcp-marketplace-publish) | MCP / JWT — token setup and tool names |
| [Troubleshooting](#troubleshooting) | Skills, rules, PATH, Codex |
| [Resources](#resources) | Docs, links, runbooks |
| [Support](#support) | Issues and community |
| [Contributing](#contributing) | Plugin layout, PR hygiene |
| [Changelog](CHANGELOG.md) | Release history |
| [License](#license) | MIT |

## What You Can Do

- **Set up your development environment** — `fw-setup` installs and manages the Freshworks Development Kit (FDK) and Node.js.
- **Scaffold a Platform 3.0 app** — `/fdk-fix` and `/fdk-migrate` get you from a blank folder or a legacy 2.x app to a passing `fdk validate` output.
- **Connect third-party APIs** — `fw-build-your-mcp-server` builds your own MCP server (`actions.json`, SMI handlers, and request templates) for services like Slack or Google.
- **Catch issues before review** — `fw-review` runs the same checks marketplace reviewers use and outputs a structured report you can act on.
- **Publish without leaving your IDE** — `fw-publish` guides you through `fdk validate → pack → upload → submit` via MCP, no browser required.

---

## Installation

```bash
npx @freshworks/fw-dev-tools install
```

Auto-detects **Cursor**, **Claude Code**, and **OpenAI Codex**. Installs all five skills and configures MCP for publish workflows.

**Options:**
```bash
npx @freshworks/fw-dev-tools install --tools cursor        # specific client
npx @freshworks/fw-dev-tools install --tools cursor,claude # multiple clients
npx @freshworks/fw-dev-tools install --yes                 # non-interactive
```

After install: restart your IDE and type `/fw-setup-` — autocomplete confirms the skills are active. For publish workflows, follow the MCP setup step the installer prints once to enable `fw-publish`.

**Keep skills up to date:**
```bash
npx @freshworks/fw-dev-tools update
npx @freshworks/fw-dev-tools status
```

> Previously installed via `npx skills add` or manual copy? Run `npx @freshworks/fw-dev-tools install` — it migrates automatically.

---

## Prerequisites

| Topic | Guidance |
|-------|----------|
| **Installing these skills into an IDE** | Works without FDK installed first; skill content lives in **`skills/*/SKILL.md`** and plugin manifests. |
| **Running Freshworks workflows (`fdk`, validate, pack)** | Use **fw-setup** (FDK **10.x**, Node **24.11.x** per **[engine-matrix.md](https://github.com/freshworks-developers/fw-dev-tools/blob/main/docs/engine-matrix.md)**). |
| **Publishing to Marketplace (MCP)** | One-time **Developer Portal JWT** + **fw-dev-mcp** config — see **[MCP (marketplace publish)](#mcp-marketplace-publish)** (no keys in chat). |
| **Corporate networks** | Firewall / proxy: **[network-requirements.md](https://github.com/freshworks-developers/fw-dev-tools/blob/main/docs/network-requirements.md)**. |

---

## Available Tools

Each tool helps with a specific part of app development. Use them in the order below for a complete workflow:

| Tool | What it does |
|------|--------------|
| [**fw-setup**](https://github.com/freshworks-developers/fw-dev-tools/tree/main/skills/fw-setup) | Install and manage FDK (Freshworks Development Kit) and Node.js |
| [**fw-app-dev**](https://github.com/freshworks-developers/fw-dev-tools/tree/main/skills/fw-app-dev) | Build complete marketplace apps with UI, OAuth, and integrations |
| [**fw-build-your-mcp-server**](https://github.com/freshworks-developers/fw-dev-tools/tree/main/skills/fw-build-your-mcp-server) | Build your own MCP server and connect third-party services |
| [**fw-review**](https://github.com/freshworks-developers/fw-dev-tools/tree/main/skills/fw-review) | Check your app for common issues before submission |
| [**fw-publish**](https://github.com/freshworks-developers/fw-dev-tools/tree/main/skills/fw-publish) | Upload and publish your app to the Freshworks Marketplace |

---

## Step-by-Step Workflow

### 1. Set up your environment — [fw-setup](https://github.com/freshworks-developers/fw-dev-tools/tree/main/skills/fw-setup)

Installs FDK 10.x + Node.js 24.x via nvm. Run this first — other skills require it.

| Command | What it does |
|---------|-------------|
| `/fw-setup-install` | Install FDK and Node.js |
| `/fw-setup-status` | Check what's currently installed |
| `/fw-setup-troubleshoot` | Fix PATH and shell config issues |

### 2. Build your app — [fw-app-dev](https://github.com/freshworks-developers/fw-dev-tools/tree/main/skills/fw-app-dev)

Scaffold and develop a Platform 3.0 app with Crayons UI, OAuth, and serverless functions.

| Command | What it does |
|---------|-------------|
| `/fdk-fix` | Fix `fdk validate` errors automatically |
| `/fdk-migrate` | Upgrade a legacy 2.x app to Platform 3.0 |

> **Validation order:** fw-setup first (when Node/FDK is wrong) → `/fdk-migrate` (legacy apps) → `fdk validate`

### 3. Build your own MCP server — [fw-build-your-mcp-server](https://github.com/freshworks-developers/fw-dev-tools/tree/main/skills/fw-build-your-mcp-server) _(optional)_

Connect to external APIs (Slack, Google, etc.) with an MCP server. The app is implemented with `actions.json`, SMI handlers, and request templates.

### 4. Review before submitting — [fw-review](https://github.com/freshworks-developers/fw-dev-tools/tree/main/skills/fw-review)

Runs the same checks marketplace reviewers use: manifest, iparams, frontend, and security. Outputs a structured report with blocking vs non-blocking findings.

### 5. Publish — [fw-publish](https://github.com/freshworks-developers/fw-dev-tools/tree/main/skills/fw-publish)

Guides you through `fdk validate → pack → upload → submit` via MCP without leaving your IDE.

**One-time setup:**
1. Get an API key from [developers.freshworks.com/developer/](https://developers.freshworks.com/developer/)
2. Configure the **fw-dev-mcp** server in your IDE — see [MCP section below](#mcp-marketplace-publish)

---

## MCP (marketplace publish)

Publishing uses the **fw-dev-mcp server**. This repo bundles `.mcp.json` at the repository root (URL + `Authorization` header). MCP token placement, copy-paste blocks, and tool names are documented in the publish skill under **[skills/fw-publish/](https://github.com/freshworks-developers/fw-dev-tools/tree/main/skills/fw-publish/)**.

**MCP boundary:** Build, fix, review, and migrate through **skills** (`fw-app-dev`, `fw-build-your-mcp-server`, `fw-review`) — not MCP. MCP is for **publish** workflows and **`get_developer_docs`** (primary platform documentation). Legacy build tools (`implement_app`, `get_implementation_plan`, `idea_to_app`, `fix_app_errors`) are deprecated on the server; see **[deprecated-mcp-build-tools.md](https://github.com/freshworks-developers/fw-dev-tools/blob/main/skills/fw-publish/references/deprecated-mcp-build-tools.md)**.

---

## Troubleshooting

Having issues with skills installation or usage?

- 📋 [**TROUBLESHOOTING.md**](https://github.com/freshworks-developers/fw-dev-tools/blob/main/TROUBLESHOOTING.md) — Covers **Cursor**, **Claude Code**, and **OpenAI Codex**

**Common issues:**
- Skills not appearing after install → Restart your IDE; for Claude Code check `~/.claude/CLAUDE.md` has the routing block
- Commands not working in Cursor → Check `~/.cursor/rules/fw-dev-tools.mdc` exists
- `fdk` or `node` not found → Run `/fw-setup-troubleshoot`
- Codex MCP config missing → Re-run `npx @freshworks/fw-dev-tools install --tools codex --yes`; installer writes `~/.codex/mcp.json`

---

## Resources

| Doc | Purpose |
|-----|---------|
| [skills/fw-publish/](https://github.com/freshworks-developers/fw-dev-tools/tree/main/skills/fw-publish/) | MCP config and publish workflow |
| [TROUBLESHOOTING.md](https://github.com/freshworks-developers/fw-dev-tools/blob/main/TROUBLESHOOTING.md) | Install and runtime issues |
| [engine-matrix.md](https://github.com/freshworks-developers/fw-dev-tools/blob/main/docs/engine-matrix.md) | FDK ↔ Node version matrix |
| [network-requirements.md](https://github.com/freshworks-developers/fw-dev-tools/blob/main/docs/network-requirements.md) | Firewall / proxy requirements |
| [CONTRIBUTING.md](https://github.com/freshworks-developers/fw-dev-tools/blob/main/CONTRIBUTING.md) | Plugin layout, PR hygiene |
| [SECURITY.md](https://github.com/freshworks-developers/fw-dev-tools/blob/main/SECURITY.md) | Vulnerability reporting; publish-zip telemetry (`.meta.json`) |
| [Platform 3.0 App Development](https://developers.freshworks.com/docs/app-sdk/v3.0/) | Official SDK docs |
| [Marketplace Publishing Guide](https://developers.freshworks.com/docs/marketplace/) | Submission requirements |
| [FDK CLI Reference](https://developers.freshworks.com/docs/fdk/) | CLI commands |

---

## Support

- [Report Issues](https://github.com/freshworks-developers/fw-dev-tools/issues)
- [Freshworks Developer Docs](https://developers.freshworks.com/)
- Community standards: [CODE_OF_CONDUCT.MD](https://github.com/freshworks-developers/fw-dev-tools/blob/main/CODE_OF_CONDUCT.MD)

## Contributing

Contributions welcome — new commands, rule fixes, reference docs, and new skills. See **[CONTRIBUTING.md](https://github.com/freshworks-developers/fw-dev-tools/blob/main/CONTRIBUTING.md)** for:
- Skill and rule file structure
- How to keep `AGENTS.md` and plugin manifests in sync
- PR process and docs hygiene scripts
- Marketplace listing kit (canonical strings, logos, blurbs)

## License

MIT
