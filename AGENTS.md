# Agent instructions — marketplace repo (contributors)

**Repo-only document.** Not shipped by the installer. End developers receive a slim routing spec (`installer/src/specs/fw-dev-tools-spec.md`) written to always-loaded IDE locations — not this file.

| Audience | Read first |
|----------|------------|
| **Contributing to this repo** | This file → **`CONTRIBUTING.md`** → **`tests/TESTING.md`** |
| **Building a Freshworks app** (any project) | **`skills/*/SKILL.md`** + installed **`fw-dev-tools.mdc`** / spec block |
| **Humans (overview, install)** | **`README.md`** · **`TROUBLESHOOTING.md`** · **`docs/engine-matrix.md`** (FDK/Node pins) |

---

## Before you open a PR

```bash
cd tests && npm install && npm test          # static tests (CI, no LLM)
cd installer && npm install && npm test      # installer lifecycle tests (CI, Node 24)
```

**Skill / command / `.meta.template.json` edits** — also run behavioral evals locally (no API key in agent session):

> "Run the skill evals"

Attach **`tests/all-tests-report.html`** to the PR. See **`tests/TESTING.md`** for all layers (static, eval, e2e).

PR checklist: **`.github/PULL_REQUEST_TEMPLATE.md`**

---

## If you change…

| You change | Also update | Verify |
|------------|-------------|--------|
| `skills/*/rules/` or `skills/*/commands/` | **Rules and commands inventory** (below) + **`.cursor-plugin/marketplace.json`** / **`.claude-plugin/marketplace.json`** `rulesPath` / `commandsPath` | `cd tests && npm test` |
| `skills/*/SKILL.md` behavioral gates | `tests/eval/skill-eval-scenarios.js` + **`tests/TESTING.md`** scenario table | `cd tests && npm run eval` |
| `skills/shared/.meta.template.json` or meta scripts | All skills referencing `meta-init.sh` / `meta-update.sh` | `cd tests && npm test` |
| `skills/fw-setup` toolchain guidance | **`docs/engine-matrix.md`** | `cd installer && npm test` |
| `installer/` | **`installer/tests/`** | `cd installer && npm test` |
| Plugin manifests | Skill inventory below stays aligned | static tests (plugin version consistency) |

Prefer **small, focused diffs**. Match existing markdown and plugin patterns.

---

## Repository layout

| Path | Purpose |
|------|---------|
| **`skills/{fw-setup,fw-app-dev,fw-ai-actions-app,fw-review,fw-publish}/`** | Skill packages (`SKILL.md`, `rules/`, `commands/`, `references/`, `assets/`) |
| **`skills/fw-review/checks/*.js`** | Deterministic rule checks, one per script-backed rule ID (mapped in `rules/script-check-rules.md`); shared CLI/result plumbing in **`skills/fw-review/runners/common.js`** |
| **`skills/shared/`** | `.meta.template.json`, `scripts/meta-*.sh`, `check-update.sh` |
| **`installer/`** | `npx @freshworks/fw-dev-tools` CLI (install, update, status, uninstall) |
| **`installer/src/specs/fw-dev-tools-spec.md`** | **Shipped** routing spec (~28 lines) → Cursor rule / Codex `AGENTS.md` block |
| **`tests/`** | Static tests, LLM evals, e2e orchestration — **`tests/TESTING.md`** |
| **`.mcp.json`** | Canonical `fw-dev-mcp` URL + `Authorization` header shape |
| **`.cursor-plugin/`**, **`.claude-plugin/`**, **`.codex-plugin/`** | Multi-skill plugin registries (`freshworks-dev-tools`) |
| **`assets/fw-logo.svg`** | Marketplace branding for plugin UIs |

**Single source of truth:** rules and commands live under each skill’s `rules/` and `commands/`; plugin JSON points there — do not duplicate trees under `.cursor/` inside skills.

---

## Agent Behavior (intelligent orchestration)

Contributor reference for the Tier 2 orchestration brain shipped alongside the routing spec.

| Artifact | Path | Role |
|----------|------|------|
| Tier 1 (always loaded) | `installer/src/specs/fw-dev-tools-spec.md` | Intent table, skill routing, non-negotiables |
| Tier 2 (on demand) | `specs/agent-behaviour.md` | Deep orchestration: intents, guardrails, escalation, session rules |

**Intents (canonical):** `create-new`, `add-feature`, `troubleshoot`, `update-existing`, `migrate`, `publish-status`.

**Session file:** `.fw-session.json` at app project root (distinct from per-app `.meta.json` metrics).

When editing orchestration rules, update **both** Tier 1 (intent table / delegation) and Tier 2 (flow detail). Keep Confluence PRD intent names aligned.

---

## Rules and slash commands (inventory)

Keep this list aligned when adding or renaming files.

### fw-setup — `skills/fw-setup/`

| Slash command | Command file |
|---------------|----------------|
| `/fw-setup-install` | `commands/fw-setup-install.md` |
| `/fw-setup-upgrade` | `commands/fw-setup-upgrade.md` |
| `/fw-setup-downgrade` | `commands/fw-setup-downgrade.md` |
| `/fw-setup-uninstall` | `commands/fw-setup-uninstall.md` |
| `/fw-setup-status` | `commands/fw-setup-status.md` |
| `/fw-setup-troubleshoot` | `commands/fw-setup-troubleshoot.md` |
| `/fw-setup-use` | `commands/fw-setup-use.md` |

**Rules (`.mdc`):** `rules/fdk-enforcement.mdc`

*(Legacy `/fdk-*` aliases may exist in some environments; prefer `/fw-setup-*`.)*

### fw-app-dev — `skills/fw-app-dev/`

| Slash command | Command file |
|---------------|----------------|
| `/fdk-react-create` | `commands/fdk-react-create.md` |
| `/fdk-react-migrate` | `commands/fdk-react-migrate.md` |
| `/fdk-fix` | `commands/fdk-fix.md` |
| `/fdk-migrate` | `commands/fdk-migrate.md` |
| `/fdk-refactor` | `commands/fdk-refactor.md` |

**Rules (`.mdc`):** `react-meta-patterns.mdc`, `app-building-blocking-gates.mdc`, `app-templates.mdc`, `async-patterns.mdc`, `complexity-reduction.mdc`, `confusion.mdc`, `freshworks-platform3.mdc`, `platform3-modules-locations.mdc`, `prerequisites-check.mdc`, `smart-prerequisites-check.mdc`, `security.mdc`, `validation-workflow.mdc`

### fw-ai-actions-app — `skills/fw-ai-actions-app/`

**Commands:** none (orchestration in `SKILL.md`; optional prompts under `agents/`).

**Rules (`.mdc`):** `ai-actions-api-docs.mdc`, `ai-actions-platform.mdc`, `ai-actions-readme.mdc`, `ai-actions-requests.mdc`, `ai-actions-schemas.mdc`, `ai-actions-server.mdc`, `ai-actions-test-data.mdc`, `ai-actions-validation.mdc`

### shared — `skills/shared/`

**Commands:** none. **Rules (`.mdc`):** `rules/preflight.mdc` (installed to `~/.fw-dev-tools/specs/preflight.mdc` with the orchestration specs).

### fw-review — `skills/fw-review/`

**Commands:** none (pipeline in `SKILL.md`; checks via `scripts/*.js` per `rules/script-check-rules.md`).

**Rules (`.md`):** `frontend-files-rules.md`, `iparam-rules.md`, `report.md`, `script-check-rules.md`

### fw-publish — `skills/fw-publish/`

**Commands:** none. **Rules:** none. Playbooks in `SKILL.md` and `references/`; MCP in repo root **`.mcp.json`**.

---

## `.meta.json` — cross-skill metrics contract

When editing skills that write metrics, keep this contract consistent across **`fw-setup`**, **`fw-app-dev`**, **`fw-ai-actions-app`**, **`fw-review`**, **`fw-publish`**.

**Template:** `skills/shared/.meta.template.json` · **Scripts:** `skills/shared/scripts/meta-init.sh`, `meta-update.sh`, `meta-feedback.sh`, `meta-delete.sh`

- Writes go through the **scripts**, not hand-authored JSON in chat.
- **Never mention `.meta.json`** to the end developer.
- Each skill updates **only its own block** in the template; never add/remove keys.
- **Top-level fields** (`tracking_id`, `source`, `ide_client`, `start_time`) are set once via `meta-init.sh` — do not overwrite on later runs.
- **Install-only top-level fields** (`version`, `method`, `client`, `installedAt`, `update_check`) live in the same template for schema documentation; `meta-init.sh` strips them from per-app `<app-dir>/.meta.json`. `check-update.sh` updates `update_check` on `~/.fw-dev-tools/.meta.json`.

| Skill | Writes when | Does NOT write when |
|-------|-------------|---------------------|
| **fw-setup** | `/fw-setup-install`, `/fw-setup-upgrade`, `/fw-setup-downgrade`, `/fw-setup-troubleshoot --fix` | `/fw-setup-status`, `/fw-setup-use`, troubleshoot without `--fix`, or no `manifest.json` in app dir |
| **fw-app-dev** | After `fdk validate` completes (0 errors / 0 warnings) | — |
| **fw-ai-actions-app** | After `fdk validate` completes (0 errors / 0 warnings) | — |
| **fw-review** | After all rules evaluated, **before** `## App Review Result` (including 0 failures) | — |
| **fw-publish** | **Before `fdk pack`** (step 4.6): `invoked` + `skill_version`; `failed_validate` at step 4 STOP; **delete** local `.meta.json` after successful publish (step 13) | Auth-only stop (step 1) with no validate attempt |

Field-level detail: each skill’s **`SKILL.md`**.

**Install state** (tooling, not per-app): `~/.fw-dev-tools/.meta.json` — written by `npx @freshworks/fw-dev-tools install`.

---

## Runtime reference (using skills — not editing this repo)

When the task is **building or publishing a Freshworks app** (in any workspace), open the relevant **`skills/*/SKILL.md`**. Do not improvise flows from this section.

**Shipped routing spec** (installer): `installer/src/specs/fw-dev-tools-spec.md`

**End-to-end order:** fw-setup → fw-app-dev / fw-ai-actions-app → **fw-review (MANDATORY)** → fw-publish

| Goal | Skill entry |
|------|-------------|
| FDK / Node install & troubleshoot | `skills/fw-setup/SKILL.md` |
| Platform 3.0 app (UI, serverless, OAuth, migrate) | `skills/fw-app-dev/SKILL.md` |
| AI Actions (`actions.json`, SMI, templates) | `skills/fw-ai-actions-app/SKILL.md` |
| Structured marketplace review | `skills/fw-review/SKILL.md` |
| Publish via MCP | `skills/fw-publish/SKILL.md` |

**MCP boundary** (`fw-dev-mcp`, config: **`.mcp.json`**):

- **Build / fix / review / migrate:** skills only — **`fw-app-dev`**, **`fw-ai-actions-app`**, **`fw-review`**
- **Publish:** **`fw-publish`** + publish MCP tools — **`skills/fw-publish/references/openai-server-mcp-tools.md`**
- **Platform docs:** MCP **`get_developer_docs`** is the **PRIMARY** source for platform questions; fall back to skill `references/` if MCP is unavailable
- **Deprecated build tools** (`implement_app`, `get_implementation_plan`, `idea_to_app`, `fix_app_errors`): server returns a deprecation contract — follow its redirect to **`fw-app-dev`**; details in **`skills/fw-publish/references/deprecated-mcp-build-tools.md`**

**Platform 3.0 non-negotiables** (app work): `"platform-version": "3.0"`, **`modules`** not `product`, external HTTP via **`$request.invokeTemplate`** + **`config/requests.json`**, zero platform + lint errors before “complete”. Authoritative: **`skills/fw-app-dev/SKILL.md`**.

---

## Human-facing install (reference)

```bash
npx @freshworks/fw-dev-tools install
```

Copies skills, writes **`fw-dev-tools-spec.md`** to always-loaded IDE locations, merges MCP config. Options: **`README.md`**. Issues: **`TROUBLESHOOTING.md`**.

**Update:** `npx @freshworks/fw-dev-tools update` · **Status:** `npx @freshworks/fw-dev-tools status`
