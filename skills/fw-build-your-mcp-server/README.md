# Build your own MCP server

Skill id: **`fw-build-your-mcp-server`**. Developers know this as **build your own MCP server** on Freshworks **Platform 3.0**. It is implemented with `actions.json`, SMI in `server/server.js`, request templates, and `manifest.json`. Canonical routing: **[AGENTS.md](../../AGENTS.md)** → **fw-build-your-mcp-server**.

## Overview

**fw-build-your-mcp-server** complements **fw-app-dev**: it focuses on `actions.json`, serverless handlers, flat request schemas, and integration guardrails without covering full UI app locations. It does **not** install FDK or Node — use **fw-setup** for the toolchain.

## Features

- Platform 3.0 manifest, `requests.json`, `iparams.json`, OAuth where needed
- `actions.json` patterns (flat request parameters, nested response where appropriate)
- `server.js` SMI patterns (`renderData`, `$request.invokeTemplate`, safe errors)
- Request templates and external API integration guardrails
- `fdk validate`, then `fdk run` with configure-locally and execute-locally links, plus test data conventions
- Optional **agents/** prompts for integration scoping, implementation, and validation (same layout idea as **fw-app-dev** `agents/`)

## Typical app layout

```
app-root/
├── actions.json
├── manifest.json
├── server/
│   ├── server.js
│   └── test_data/
│       └── actionName.json
├── config/
│   ├── requests.json
│   ├── iparams.json
│   └── oauth_config.json   # optional
└── README.md
```

## Installation

```bash
npx @freshworks/fw-dev-tools install
```

Or copy this folder into `.cursor/skills/fw-build-your-mcp-server/` (or your tool’s skills directory).

### Install as Claude plugin

**Step 1**

```bash
claude plugin marketplace add freshworks-developers/fw-dev-tools
```

**Step 2**

```bash
claude plugin install fw-build-your-mcp-server@freshworks-developers
```

## Contents

- **SKILL.md** — Orchestrator; points to rules and references
- **agents/** — Integration scoper, scope implementer, MCP server integration validator
- **rules/** — Scoped `.mdc` rules (platform, schemas, server, requests, validation, test data, README, API docs). Full table in repo [`AGENTS.md`](../../AGENTS.md) (*Rules and slash commands* → **fw-build-your-mcp-server**).
- **references/** — `ai-actions-guide.md`, quick reference, core constraints
- **assets/templates/ai-actions-skeleton/** — Fuller template (manifest, sample actions, server handlers, test data)

## Requirements

- Node.js **24.x** and **FDK 10.x** (see **fw-setup** and **fw-app-dev** skills in this repo for toolchain and general app guidance)

## Support

- [MCP server — Freshworks Developer Docs](https://developers.freshworks.com/docs/app-sdk/v3.0/common/actions/)
- [GitHub issues — fw-dev-tools](https://github.com/freshworks-developers/fw-dev-tools/issues)
- [Issues — marketplace](https://github.com/freshworks-developers/marketplace/issues)

## License

MIT (same as this repository).
