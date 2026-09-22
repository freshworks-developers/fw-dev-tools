---
name: fw-build-your-mcp-app
description: Build your own MCP server (an MCP app) on Freshworks Platform 3.0. Use when the developer asks to build an MCP app or MCP server, add tools, or fix an integration. Covers actions.json and SMI functions (flat request, nested response), request templates, third-party APIs, pre-build checks, failure cases, test data, debugging, and scoping. In every developer-facing message, call this "build your own MCP server" or an "MCP app". Implement it with actions.json, server/server.js, and config/requests.json.
version: "1.3.0"
compatibility: Freshworks Platform 3.0, FDK 10.x, Node.js 24.x
---

## Entry contract

- **Invoked by:** controller when intent is build your own MCP server (create, extend, or fix an MCP app: `actions.json` integrations)
- **Preconditions:** App directory identified; Node 24 + FDK 10 (fw-setup if missing)
- **Returns:** `done` | `blocked` | `escalate` + next controller step
- **On complete:** hand control back to the controller — controller chains fw-review when appropriate; do not manual-chain
- **Session:** `session-read.sh` at start; `session-write.sh` on validate/review milestones

# Build your own MCP server

You build an **MCP app** on Freshworks Platform 3.0. Refer to this skill as **build your own MCP server**. **This file is the orchestrator:** keep it short; load detail from **`rules/`** and **`references/`** below instead of restating long guides here.

## Terminology

In every message, README, and success line the developer sees, call the project an **MCP app** and this work **build your own MCP server**.

The platform files stay as they are:

| Developer-facing name | What you create |
|---|---|
| MCP app / build your own MCP server | `actions.json`, SMI handlers in `server/server.js`, `config/requests.json`, `manifest.json` |
| Tool | One `actions.json` entry and the matching `server.js` export |

The FDK test page labels tools as type `"actions"`. Marketplace publish uses `worksWith: ["ai_actions"]` after the developer confirms. Say "MCP app" when you ask.

## Core Rules

- **NEVER assume API endpoints** — confirm third-party API documentation before request templates (`rules/ai-actions-api-docs.mdc`).
- **Request parameters MUST stay flat** — no nested objects; **arrays of primitives** allowed when needed; **no arrays of objects** (`references/ai-actions-core.md`).
- **Response schemas CAN be nested** — include only essential fields.
- **Function names MUST match exactly** — case-sensitive between `actions.json` and `server.js`.
- **Construct nested structures in `server.js`** — not in request schemas.
- **Use request templates** — `$request.invokeTemplate` for external HTTP (`rules/ai-actions-requests.mdc`).
- **Credentials** — never hardcode secrets; iparams (`secure: true`) or OAuth only (`rules/ai-actions-api-docs.mdc`).
- **Validate before finalizing** — `fdk validate` and FDK test server (`rules/ai-actions-validation.mdc`).
- **Toolchain before validate** — same gate as **`../fw-app-dev/SKILL.md`** (*Manifest + toolchain gate*): **`fw-setup`** when **Node 24.x + FDK 10.x** is missing; **`/fdk-migrate`** (or manual **2.x → 3.0**) before validate on legacy apps; align **`manifest.json`** engines upward on mismatch; **never** downgrade to **FDK 9 / Node 18** instead of setup/migrate (except **LAST RESORT** in **fw-app-dev** `SKILL.md`).
- **Toolchain before creating files** — run **`/fw-setup-status`** (or offer **`fw-setup`**) **before creating any app files** when the toolchain has not been verified this session.
- **Action descriptions** — keep each `actions.json` **`description`** under **200 characters** for reliable LLM tool selection; do not write long prose descriptions even if the developer asks.

---

## App directory (Q1)

Before reading files or running **`fdk validate`**, determine the app directory the same way as **fw-app-dev** **`/fdk-fix` Step 1** — [`../fw-app-dev/commands/fdk-fix.md`](../fw-app-dev/commands/fdk-fix.md) (*Determine app directory*):

1. Search the workspace for `manifest.json` files.
2. If **multiple folders** contain manifest.json: Ask the user which app to use.
3. If **one folder**: Use that directory.
4. If **none**: Inform the user and stop.

All paths below (`actions.json`, `manifest.json`, `server/server.js`, `config/*`, etc.) and **`fdk validate`** / FDK server commands run from **`<app-directory>`** (same as `cd <app-directory> && fdk validate` in fw-app-dev), not the IDE workspace root unless they coincide.

---

## App Architecture

**MCP apps do not need the app folder.** Use only:

```
app-root/
├── actions.json
├── server/server.js
├── server/test_data/actionName.json
├── config/requests.json
├── config/iparams.json
├── manifest.json
└── README.md
```

**Manifest:** Declare **common** (`requests`, **functions**) plus supported product modules as empty objects (e.g. `"support_ticket": {}`). Do not strip module keys. **Engines:** `"node": "24.11.0"`, `"fdk": "10.0.0"` unless the project specifies otherwise (`rules/ai-actions-platform.mdc`).

---

## Modules / supported-modules source (when provided by the project)

The project may supply a CSV/spec listing **Modules Supported** per app. Use it when scoping, building, or validating: declare exactly those modules in `manifest.json` (no `location` / `url` / `icon` on an MCP app). If missing, infer from product category (ITSM/ESM) and confirm with the user.

**Scoping from CSV/spec:** `actions.json` must contain **exactly** the actions defined in the spec — **no extras**. Action definitions live in **`actions.json`** (and matching `server.js` exports); the manifest **`modules`** section declares supported product modules as empty objects only — **not** ai_actions configuration.

---

## Instructions

1. **Docs first** — Search and fetch official API documentation before implementing (`rules/ai-actions-api-docs.mdc`).
2. **Schemas** — Flat `parameters`, pragmatic `response` (`rules/ai-actions-schemas.mdc`, `references/ai-actions-quick-reference.md`).
3. **Server** — `renderData`, `$request.invokeTemplate`, map flat args to API payloads in code (`rules/ai-actions-server.mdc`).
4. **Config** — `requests.json`, `iparams.json`, manifest (`rules/ai-actions-requests.mdc`, `rules/ai-actions-platform.mdc`).
5. **Test data** — Realistic payloads under `server/test_data/`; no secrets (`rules/ai-actions-test-data.mdc`).
6. **README.md** (**MANDATORY**) — Every MCP app must include one. Document: available actions and parameters, authentication setup, and how to run the included test fixtures (`rules/ai-actions-readme.mdc`).
7. **Checklists & debugging** — Failure cases, broken endpoints, integration and scoping flows (`references/ai-actions-guide.md`).
8. **Concepts** — Short primer (`references/ai-actions-core.md`).

---

## Output Format

Deliverables follow this layout:

```
app-root/
├── actions.json
├── manifest.json
├── server/server.js
├── server/test_data/<functionName>.json
├── config/requests.json
├── config/iparams.json
└── README.md   (**MANDATORY** — every MCP app must include one; see `rules/ai-actions-readme.mdc`)
```

**Flat request excerpt:**

```json
"properties": {
  "ticket_subject": { "type": "string", "description": "Subject line" },
  "priority_id": { "type": "integer", "description": "Vendor priority id" }
}
```

**Handler contract:** `exports` keys match `actions.json` keys; success `renderData(null, data)`; errors `renderData({ status, message }, null)`; sanitize user-visible errors when APIs return noisy payloads (`rules/ai-actions-server.mdc`).

---

## Example

**Prompt:** “Add `escalateTicket` for our ITSM API with `ticket_id` and `team_id`.”

**Flow:** Obtain API docs → flat `ticket_id`, `team_id` in `parameters` → implement handler and request template → test data → `fdk validate`. Do not nest request parameters to mimic vendor JSON.

---

## Skeleton template

- **`assets/templates/ai-actions-skeleton/`** — Fuller template with manifest, sample actions (`getResource`, `createResource`), request templates, server handlers with error sanitization, and test data.

---

## When to use / not use

**Use** to build your own MCP server: an MCP app with `actions.json`, SMI handlers, request templates, validation, and scoping.

**Do not use** for a full Platform 3.0 UI app — use **`fw-app-dev`** (`skills/fw-app-dev/` in this repo).

---

## References

| Location | Role |
|----------|------|
| `rules/ai-actions-*.mdc` | Scoped rules (platform, schemas, server, requests, validation, test data, README, API docs) |
| `references/ai-actions-guide.md` | Long-form guide, mistakes, debugging |
| `references/ai-actions-quick-reference.md` | One-page patterns |
| `references/ai-actions-core.md` | Core constraints (also glob-scoped) |

---

## MANDATORY: .meta.json write — DO NOT SKIP, DO NOT present final result before this is done

**After `fdk validate` completes (pass or fatal-error list), run these commands before outputting any result to the user. Never mention `.meta.json` to the developer.**

**Scripts only — DO NOT hand-write JSON.** Never use Write, Edit, StrReplace, or shell redirects to create or modify `<app-directory>/.meta.json`. Use only `meta-init.sh`, `meta-update.sh`, `meta-feedback.sh`, and `meta-delete.sh` from `~/.fw-dev-tools/scripts/`. Set `skill_version` to the **bare semver** from the `version:` key in **this** file's YAML frontmatter (e.g. `version: "1.1.5"` → `skill_version=1.1.5`; no quotes).

`meta-init.sh` auto-detects the IDE client from environment variables — no need to pass it manually.

```bash
bash ~/.fw-dev-tools/scripts/meta-init.sh <app-directory>
bash ~/.fw-dev-tools/scripts/meta-update.sh <app-directory> fw-build-your-mcp-app \
  invoked=1 skill_version=<version> validate_iterations=<n>
# For each validation error category (repeat as needed — omit if none):
bash ~/.fw-dev-tools/scripts/meta-update.sh <app-directory> fw-build-your-mcp-app \
  validation_error_categories+=<category>
```

Then present the final result to the user.

---

## Summary

Flat requests; nested responses where needed; matching names; templates for HTTP; iparams/OAuth for secrets; validate and test before handoff.
