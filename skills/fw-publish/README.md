# fw-publish

Skill for publishing **Freshworks Platform 3.0** custom apps to the **Freshworks Marketplace** using MCP tools: validate, pack, **app-upload**, then submit or update an app version.

## Overview

**fw-publish** guides you through auth preflight, `fdk validate` / `fdk pack`, binary upload, and marketplace API steps without leaving your IDE. MCP server config is **`.mcp.json`** at the **repository root**. Pair with **fw-app-dev** (full UI apps) or **fw-build-your-mcp-app** (MCP app / `actions.json` integrations) for manifest and validation fixes before packing. Skill routing: **[AGENTS.md](../../AGENTS.md)**.

## Install

**Claude Code:**

```bash
claude plugin marketplace add freshworks-developers/fw-dev-tools
claude plugin install fw-publish@freshworks-dev-tools
```

**Cursor:**

```bash
npx @freshworks/fw-dev-tools install --tools cursor
```

**OpenAI Codex:**

```bash
codex plugin marketplace add freshworks-developers/fw-dev-tools
```

## What's included

| Path | Purpose |
|------|---------|
| `SKILL.md` | Orchestration, MCP tool usage, error handling |
| *(repo root)* `.mcp.json` | Reference `fw-dev-mcp` server block (URL + `Authorization`); bundled at monorepo root, not under `skills/fw-publish/` |

## Requirements

- **Developer Portal API key** for MCP authentication: API key from [developers.freshworks.com/developer/](https://developers.freshworks.com/developer/) - API key for Freddy AI Copilot for VS Code plugin & Agentic Developer Toolkit. or Connect to Developer MCP server (For MCP configuration)
- **MCP server configuration**: `fw-dev-mcp` at `https://mcp.freshworks.dev/mcp` with `Authorization` header
  - **Claude Code**: API key stored in keychain via `userConfig.mcp_auth_token`, referenced as `${user_config.mcp_auth_token}`
  - **Cursor**: Copy `.mcp.json` server block to `~/.cursor/mcp.json` and use literal `Bearer <token>` (Cursor doesn't resolve `user_config`)
- **FDK 10.x** and **Node 24.x** for validate/pack (see **fw-setup**)
- Built zip from `fdk pack` before upload

### MCP Tools Available

| Tool | Role |
|------|--------|
| **`list_custom_apps`** | List all custom apps. Returns **`count`** and **`apps`** (each with **`id`**, **`name`**, **`type`**, **`state`**, **`latestVersion`**, …). Optional **`page`**, **`perPage`**. |
| **`list_app_versions`** | List all versions for one app. Returns array with **`id`**, **`version`**, **`platformVersion`**, **`state`**, **`updatedAt`**. **CRITICAL** for checking stuck **`development`** versions before **`add_app_version`**. |
| **`create_app_upload_url`** | Generate presigned S3 upload URL + **`uploadId`** |
| **`submit_custom_app`** | Create new app + first version |
| **`add_app_version`** | Add new version to existing app. **Cannot proceed** if any version is in **`development`** state (check with **`list_app_versions`** first). |
| **`get_app_status`** | Get aggregate app-level status by **`appId`** |
| **`get_developer_docs`** | **PRIMARY** platform docs — use first; fall back to skill `references/` if MCP unavailable |

**Deprecated (server returns redirect contract):** `implement_app`, `get_implementation_plan`, `idea_to_app`, `fix_app_errors` — see **`references/deprecated-mcp-build-tools.md`**.

## Support

- [Freshworks Developer Portal](https://developers.freshworks.com/developer/)
- [GitHub issues](https://github.com/freshworks-developers/fw-dev-tools/issues)

## License

MIT (same as this repository).
