# Changelog

All notable changes to `@freshworks/fw-dev-tools` are documented here.

---

## [Unreleased]

### Changed
- **fw-build-your-mcp-server:** skill id renamed from `fw-build-your-mcp-app` (earlier `fw-ai-actions-app`). Invoke it as `/fw-build-your-mcp-server`. External developers see this as **build your own MCP server**. The app is still implemented with `actions.json` and SMI handlers. Install/update removes the old skill directories.
- **fw-build-your-mcp-server:** after `fdk validate` passes, start `fdk run` and ask the developer to configure locally and execute locally.

---

## [1.3.0] — 2026-07-30

### React Meta (fw-app-dev)
- **React Meta is now the default UI stack** for new Platform 3.0 apps — DEW components, `metaConfig.framework: "react"`, React Router
- New commands: **`/fdk-react-create`** (scaffold) and **`/fdk-react-migrate`** (vanilla JS → React Meta)
- Three new skeletons: `react-meta-frontend`, `react-meta-hybrid`, `react-meta-oauth`
- Engine guidance split: Meta apps require **FDK 10.1.0+**; vanilla/serverless remain on **FDK 10.0.1**
- `react_meta_workflow` telemetry flag in `.meta.json` for create/migrate workflows ([#55](https://github.com/freshworks-developers/fw-dev-tools/pull/55))
- **`/fdk-react-migrate`:** mandatory `/app/...` route remapping and `fdk run` UI smoke test before completion ([#56](https://github.com/freshworks-developers/fw-dev-tools/pull/56))
- **Skill routing:** post-generation flow directs review → `fw-review` and publish → `fw-publish` (not generic review or raw FDK docs) ([#56](https://github.com/freshworks-developers/fw-dev-tools/pull/56))

### Bug Fixes
- **Installer:** `copySkills()` copies only installable skill dirs (`fw-*`), not `skills/shared/` ([#29](https://github.com/freshworks-developers/fw-dev-tools/issues/29))
- **Codex installer:** write MCP config to `~/.codex/mcp.json` instead of `process.cwd()/.mcp.json` so install location no longer depends on shell working directory ([#42](https://github.com/freshworks-developers/fw-dev-tools/issues/42))
- **Cursor uninstall:** remove `fw-dev-mcp` from `~/.cursor/mcp.json` on uninstall, preserving other MCP entries ([#28](https://github.com/freshworks-developers/fw-dev-tools/issues/28))
- **macOS Tahoe (Darwin 25+):** strip `com.apple.provenance` xattr after `writeInstallState()` to prevent EPERM on `.meta.json` writes ([#27](https://github.com/freshworks-developers/fw-dev-tools/issues/27))

### Changed
- **meta-init.sh:** auto-detect IDE client from environment variables; optional second argument; skills call `meta-init.sh <app-dir>` only (supersedes PR #53)
- **fw-ai-actions-app:** `README.md` is now a mandatory build step with consolidated template in `ai-actions-readme.mdc`
- **CI:** fold manual skill evals into `ci.yml` (`workflow_dispatch` + **Run skill evals**); remove `eval-manual.yml`; unify to Node 24
- Replace deprecated `@anthropic-ai/add-skill` install references with `npx @freshworks/fw-dev-tools install` ([#33](https://github.com/freshworks-developers/fw-dev-tools/issues/33))

### Documentation
- **fw-app-dev:** fix stale OAuth checklist in `fdk_create.md` — Platform 3.0 `options.oauth` pattern instead of `auth_type` ([#32](https://github.com/freshworks-developers/fw-dev-tools/issues/32))
- **fw-app-dev:** fix Best Practices #4 in `oauth-configuration-latest.md` — `client_secret` belongs in `oauth_config.json`, not `iparams.json` ([#31](https://github.com/freshworks-developers/fw-dev-tools/issues/31))
- **fw-setup:** document dual-stack FDK coexistence via nvm; clarify same-Node-only uninstall; broaden CDN tarball warnings against any registry install ([#45](https://github.com/freshworks-developers/fw-dev-tools/issues/45))
- **SECURITY.md:** disclose that `.meta.json` skill metrics are included in marketplace publish zips by design ([#43](https://github.com/freshworks-developers/fw-dev-tools/issues/43))
- **TESTING.md:** rewrite for layered test layout; add **When to run which layer** policy table ([#39](https://github.com/freshworks-developers/fw-dev-tools/issues/39))

### Test Suite
- Restructured into 5 layers: installer, static, regex evals, LLM evals, E2E — unified runner via `tests/run-all-tests.sh`
- Regex eval scenarios moved to per-skill `.mjs` files under `tests/eval/regex/`; LLM scenarios to `tests/eval/scenarios/`
- New `fw-app-dev-49` eval scenario for React Meta default routing

---

## [1.2.0] — 2026-06-22

### Unified Installer CLI
- Single `npx @freshworks/fw-dev-tools install` replaces all previous install methods (`npx skills add`, manual copy)
- Supports Claude Code, Cursor, and Codex with `install`, `update`, `status`, and `uninstall` subcommands
- Install state tracked in `~/.fw-dev-tools/.meta.json`

### App Metrics & Developer Feedback
- All 5 skills write structured metrics to `<app-root>/.meta.json` via `meta-init.sh` / `meta-update.sh` scripts
- `meta-feedback.sh` captures a post-publish liked/disliked rating that travels with the app zip
- Platform ingests metrics from the uploaded zip automatically — never exposed to the developer

### Post-Build Review/Publish Chain
- After a successful `fdk validate`, fw-app-dev prompts to review and publish — chaining fw-review → fw-publish in one flow

### Update Check
- `check-update.sh` runs on first skill invocation per session and nudges once per day if a newer version is available

### Bug Fixes
- **macOS Tahoe (Darwin 25+):** fixed EPERM when writing `.meta.json` — switched to atomic write (`.tmp` → rename) in `writeInstallState()` to avoid macOS TCC/provenance restrictions on files created by npx
- **Cursor uninstall** only ran for the last-installed client — now correctly removes all installed clients
- **Codex** `ERR_FS_CP_EINVAL` on install when plugin path matched skills source

### Test Suite
- 195 static skill tests (no LLM)
- 118 installer tests (unit, integration, lifecycle subprocess)
- E2E suite: `--workflow build`, `build-review`, `publish-guard`

---

## [1.0.0] — Initial Release

### 5 Skills for Freshworks Platform 3.0 development

| Skill | Purpose |
|-------|---------|
| **fw-setup** | Install, upgrade, and manage FDK and Node.js toolchain |
| **fw-app-dev** | Build, validate, and iterate on Platform 3.0 apps |
| **fw-ai-actions-app** | Build AI Actions apps with serverless and frontend support |
| **fw-review** | Pre-submission app review against marketplace guidelines |
| **fw-publish** | Pack and publish apps to the Freshworks marketplace |

Install via: `npx skills add https://github.com/freshworks-developers/fw-dev-tools --skill <skill-name>`
