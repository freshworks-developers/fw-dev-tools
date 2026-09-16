# Freshworks Agentic Developer Toolkit

Managed install. Update with: `npx @freshworks/fw-dev-tools update`

## Update check (once per session)

On the **first skill invocation** of each session: run `bash ~/.fw-dev-tools/scripts/check-update.sh` and print its output if non-empty. Then proceed normally.

`check-update.sh` writes `update_check` fields to **`~/.fw-dev-tools/.meta.json`** (install state). Do **not** write `update_check` to per-app `<app-dir>/.meta.json` — that file is for skill metrics only (`meta-init.sh` / `meta-update.sh`; set `skill_version` from the active skill's `SKILL.md` `version:` field).

## IDE skill paths (MANDATORY)

Read fw-dev-tools skills **only** from the install path for your IDE. **Never mix paths** across IDEs.

| IDE | Skill path |
|---|---|
| **Cursor** | `~/.cursor/skills/fw-<name>/SKILL.md` |
| **Codex** | `~/.codex/skills/fw-<name>/SKILL.md` |
| **Claude Code** | `~/.fw-dev-tools/skills/fw-<name>/SKILL.md` |

## Controller loop (every turn)

```
user message
  → 1. classify intent (six intents; aliases: create→create-new, update→update-existing)
  → 2. read session (`.fw-session.json` via `bash ~/.fw-dev-tools/scripts/session-read.sh <app-dir>`)
  → 3. ground in ecosystem core (~/.fw-dev-tools/specs/ecosystem-map.md)
  → 4. write session (session-write.sh), then SHOW the progress checklist before any skill runs:
       `bash ~/.fw-dev-tools/scripts/session-to-todos.sh <app-dir>` -> paste its stdout into your
       reply (add --json and hand the array to TodoWrite where the client has that tool).
       One command, any intent. BLOCKING — Tier 2 §entry-contract "Checklist-first gate" / G8.
       Running it is not enough: output left in a collapsed tool block is not a shown checklist.
  → single skill fits?
       yes  → 5. dispatch skill (entry contract in skills/*/SKILL.md)
       no   → 5. decompose (Tier 2 agent-behaviour.md §decomposition)
  → 6. advance session (session-write.sh) + re-render the checklist + chain next step
  → (loop — skills return to controller; do not manual-chain)
```

**Tier 2 brain:** `~/.fw-dev-tools/specs/agent-behaviour.md` (always-loaded copy) — load intent sections, guardrails, escalation, telemetry on demand.

**Preflight:** first message per session — `~/.fw-dev-tools/specs/preflight.mdc`; see Tier 2 §preflight.

## Which skill to use

| Goal | Skill |
|---|---|
| Build, fix, review, or migrate a Platform 3.0 app | `fw-app-dev` |
| AI Actions integrations | `fw-ai-actions-app` |
| Structured app review | `fw-review` |
| Install / upgrade FDK and Node | `fw-setup` |
| Publish to marketplace | `fw-publish` |

**End-to-end order:** fw-setup → fw-app-dev / fw-ai-actions-app → fw-review (MANDATORY) → fw-publish

## Intent routing (Tier 1 cues)

| Intent | Signals | Tier 2 section |
|--------|---------|----------------|
| `create-new` | No `manifest.json` | `#create-new` |
| `add-feature` | Valid manifest; extend app | `#add-feature` |
| `troubleshoot` | Build/validation errors | `#troubleshoot` |
| `update-existing` | Published app; session publish state | `#update-existing` |
| `migrate` | Platform 2.x / FDK 9 in manifest | `#migrate` |
| `publish-status` | Rejection / deployment questions | `#publish-status` |

If intent is unclear, follow Tier 2 `#disambiguation` — ask **one** clarifying question; do not guess.

**Aliases:** `create` → `create-new`, `update` → `update-existing`.

After classification emit telemetry: `bash ~/.fw-dev-tools/scripts/agent-telemetry.sh <app-dir> intent_detected last_intent=<intent>`.

## Non-negotiables

- Platform version `"3.0"`; use `modules` not legacy `product`
- New UI apps: React Meta default; vanilla Crayons only when explicitly requested
- External HTTP only via `$request.invokeTemplate` and `config/requests.json`
- `fdk validate`: zero platform errors and zero lint errors before complete
- fw-review is MANDATORY before fw-publish — never skip it
- Per-app `<app-dir>/.meta.json`: write **only** via `meta-init.sh` / `meta-update.sh` (and `meta-feedback.sh` / `meta-delete.sh` for publish) — **never** hand-write or Edit/Write the file; `skill_version` from the active skill's `SKILL.md` `version:` field, not `plugin.json`
- MCP boundary: build/fix/review/migrate via skills only; publish via fw-publish + MCP publish tools; **`get_developer_docs`** is the **PRIMARY** documentation source for platform questions (fall back to skill references if MCP unavailable)
- Legacy MCP build tools (`implement_app`, `get_implementation_plan`, `idea_to_app`, `fix_app_errors`) return a **deprecation contract** on the server — if invoked, follow the redirect to fw-app-dev (do not retry the tool)
- **Deprecated MCP tools** — if invoked, output exactly and stop (Tier 2 §deprecated-mcp):
  > [DEPRECATED] This action is no longer supported. Please use the modern `fw-app-dev` skill instead located at `skills/fw-app-dev/SKILL.md`. Stopping execution.

  Blocked tools: `implement_app`, `get_implementation_plan`, `idea_to_app`, `fix_app_errors`
