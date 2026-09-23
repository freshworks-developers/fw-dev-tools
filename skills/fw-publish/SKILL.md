---
name: fw-publish
description: "Publish any Freshworks Platform 3.0 custom app via MCP tools: fdk validate/pack, app-upload, and submit/update through openai-server. Pre-publish: confirm Developer JWT matches manifest product modules (Freshdesk support_* vs Freshservice service_*; multiproduct sequential). At publish time, ask new vs existing listing; for new listings, prompt for supportEmail before create_app_upload_url (required for submit_custom_app). list_custom_apps for updates so the developer selects appId, then MCP handover (submit_custom_app or add_app_version with uploadId). Use when the user wants to push an app to the Marketplace (test), check publish status, or list existing apps. Pair with fw-app-dev for manifest or module fixes. Works with Cursor, Claude Code, and any MCP-compliant client."
version: "1.3.0"
compatibility: "Freshworks Platform 3.0, MCP (fw-dev-mcp), Developer Portal JWT"
---

## Entry contract

- **Invoked by:** controller after fw-review pass and explicit user consent to publish
- **Preconditions:** fw-review completed; MCP auth confirmed (`list_custom_apps` smoke test); non-sandbox network for upload
- **Returns:** `done` (submit/version created) | `blocked` (auth/network/review missing) | `escalate` (repeated upload failures)
- **On complete:** hand control back to the controller — update session publish block via `session-write.sh`; do not start new workflows
- **Session:** read `publish.tracking_id` from session; write `publish.tracking_id`, `step=published` after successful submit

# Publish (Platform 3.0 custom app)

**MANDATORY PREREQUISITE:** Run **fw-review** skill before publishing to ensure marketplace compliance. The review checks iparams, frontend files, security patterns, and generates a structured audit report. Do not proceed with publishing until review passes.

**Goal:** Take **any** Platform **3.0** app folder (with `manifest.json`), produce `dist/*.zip`, and publish it to the **Freshworks Marketplace** via MCP tools. **Currently, only `test` state is supported.**

**Sandbox / agent egress:** Publish **does not work** in **sandbox** (or equivalent) modes that block MCP traffic to `https://mcp.freshworks.dev/mcp` or outbound HTTPS (including **`curl`** PUT to the app-upload URL). Some **cloud or CI agent** runtimes send HTTPS through a **proxy, gateway, or assumed IAM role** that is **not allowed** to `PUT` to the Marketplace app-upload bucket (`fa-*-app-uploads`…): S3 returns **`403` / `AccessDenied`** even when the presigned URL is valid. **Do not** run this playbook in a sandboxed agent or restricted shell. If the user’s client offers sandbox vs full network access, choose **non-sandbox** / allow network for publish. On **403 PUT** after following step 8 exactly, ask the user to run the same script command **on their local machine** (see step 8).

## Agent playbook (MCP tools)

**Tool names and parameters** match Freshworks **`openai-server`** ([`references/openai-server-mcp-tools.md`](references/openai-server-mcp-tools.md)). Hosted MCP: **`https://mcp.freshworks.dev/mcp`**.

### 1. Auth token preflight (MUST be step 1)

Before any MCP tool call, verify that the MCP publish tools are available and authenticated:
- Attempt to call **`list_custom_apps`** (optionally `{}` or `{ "page": 1, "perPage": 10 }`). Treat this as an **auth / connectivity smoke test** only — **do not** use this call alone to pick **`appId`**. At **publish time** (step 6), you will ask **new vs existing** again and, for **existing**, call **`list_custom_apps`** for developer selection.
- If the call succeeds, auth is confirmed — proceed to step 2.
- If tools are not available or the call returns an auth error, determine which case applies:

**Case A — MCP server already configured, token missing or expired:**

The MCP server is set up but the API key needs to be refreshed or was never set.

1. Go to [https://developers.freshworks.com/developer/](https://developers.freshworks.com/developer/)
2. Under **"API key for Freddy AI Copilot VS Code plugin & Freshworks Agentic Developer Toolkit"** → click **"View API Key"**
3. Under **"Connect to Freddy AI Copilot MCP server"** → select your IDE tab → click **Copy**
4. Update the token in your IDE’s MCP settings and restart/reload the MCP connection
5. Re-run the publish command

**Case B — MCP server not configured yet:**

1. Go to [https://developers.freshworks.com/developer/](https://developers.freshworks.com/developer/)
2. Under **"Connect to Freddy AI Copilot MCP server"** → select your IDE tab (**Cursor** or **VS Code**)
3. **Cursor:** Click **"Install in Cursor"** directly, or merge [`references/templates/cursor-mcp-setup.json`](references/templates/cursor-mcp-setup.json) into `~/.cursor/mcp.json` (replace `<your-api-key>`, restart Cursor).

   **Claude Code (via plugin):** The freshworks plugin prompts for the API key at install time. If you skipped it, run `/config` and update the plugin settings. The key is stored securely in the system keychain.

   **Claude Code (standalone skill, no plugin):** Add [`references/templates/claude-mcp-setup.json`](references/templates/claude-mcp-setup.json) to project `.mcp.json` or `~/.claude.json` via `claude mcp add --scope user` (replace `<your-api-key>`, restart Claude Code).
4. Re-run the publish command

**DO NOT proceed with any publish step until auth is confirmed.**

### 2. Determine app directory

**Use the same steps as fw-app-dev `/fdk-fix` Step 1** — see [`../fw-app-dev/commands/fdk-fix.md`](../fw-app-dev/commands/fdk-fix.md) (*Determine app directory*):

1. Search the workspace for `manifest.json` files.
2. If **multiple folders** contain manifest.json: Ask the user which app to publish.
3. If **one folder**: Use that directory.
4. If **none**: Inform the user and stop.


### 2.5 Pre-publish: confirm API key is for the right product

The Developer API key is **product-specific**. Ask the user to confirm their configured API key matches the product they are publishing this app to. **STOP** if they are unsure — they need to verify or update the key before continuing.

### 3. Check Node.js and FDK versions (before pack)

- Read `engines.node` and `engines.fdk` from `manifest.json` in the app directory
- Check active versions: `node --version` and `fdk --version`
- **If `fdk` is missing** (`fdk --version` fails / command not found): **STOP**. Do **not** auto-install or assume “latest FDK” without asking. Tell the user the Freshworks CLI is required for **`fdk validate`** / **`fdk pack`**. Offer **`fw-setup`**: **`/fw-setup-install`** (default FDK **10.x** on Node **24.11**). **Optional one-shot:** **“Run `/fw-setup-install` now? (y/n)”** — only on **yes**, follow **`skills/fw-setup/SKILL.md`**; on **no**, end until the user installs manually. **Do not** continue to step 4 until **`fdk`** is available (unless the user explicitly overrides with understanding of the risk).
- **If versions mismatch** (but `fdk` is present), **STOP** and show [`references/templates/engines-mismatch-prompt.txt`](references/templates/engines-mismatch-prompt.txt) (substitute manifest vs current versions).
- **DO NOT proceed with `fdk pack` until versions match or user explicitly overrides**

### 4. fdk validate (pre-publish)

Run `cd <app-directory> && fdk validate` and treat the result as the **validity gate** for upload:

- **Required for any upload/submit:** **zero platform errors** and **zero lint errors** (same bar as **fw-app-dev**). If either fails, **STOP** — write metrics (see **Validate failure metrics** below), then use the **fw-app-dev** skill to fix; **do not** call **`create_app_upload_url`**, **do not** run **`fdk pack`**, and **do not** upload a zip.
- **`fdk pack --skip-coverage --skip-lint`** (step 5) only skips **pack-time** coverage/lint work — it **does not** waive this step. Never infer “app is valid” from pack alone.

**Validate failure metrics (before STOP at step 4):** Never mention `.meta.json` to the developer.

**Scripts only — DO NOT hand-write JSON.** Never use Write, Edit, StrReplace, or shell redirects to create or modify `<app-directory>/.meta.json`. Use only `meta-init.sh`, `meta-update.sh`, `meta-feedback.sh`, and `meta-delete.sh` from `~/.fw-dev-tools/scripts/`. Set `skill_version` to the **bare semver** from the `version:` key in **this** file's YAML frontmatter (e.g. `version: "1.1.5"` → `skill_version=1.1.5`; no quotes).

```bash
bash ~/.fw-dev-tools/scripts/meta-init.sh <app-directory>
bash ~/.fw-dev-tools/scripts/meta-update.sh <app-directory> fw-publish \
  invoked=1 skill_version=<version> publish_outcome=failed_validate
```

Keep `.meta.json` on disk. Do **not** run `meta-delete.sh`.

`meta-init.sh` auto-detects the IDE client from environment variables — no need to pass it manually.

**Marketplace backend:** An **invalid** zip may still be accepted: the API can create a **Draft** version without rejecting the package. **Do not** treat a successful **`submit_custom_app`** / **`add_app_version`** as proof the app is installable — enforce a **clean `fdk validate`** before step 7.

### 4.5 MANDATORY — Developer experience feedback (REQUIRED to ask, answer is optional)

**You MUST ask this question before proceeding to fdk pack. Do not skip this step.**

Ask the developer once — show [`references/templates/developer-feedback-rating-prompt.txt`](references/templates/developer-feedback-rating-prompt.txt) **verbatim**.

If they respond with 👍 or 👎, follow up once — show [`references/templates/developer-feedback-comment-prompt.txt`](references/templates/developer-feedback-comment-prompt.txt) **verbatim**.

Then write feedback **before proceeding to step 5** using `meta-feedback.sh` (never write JSON by hand). If the developer skips or does not respond, **do not call** `meta-feedback.sh` — omit the `"developer_feedback"` key entirely. Never mention `.meta.json` to the developer.

```bash
# Developer chose 👍 or 👎 and provided a comment:
bash ~/.fw-dev-tools/scripts/meta-feedback.sh <app-directory> liked "Setup was smooth, fw-review caught issues I missed"

# Developer chose 👍 or 👎 and skipped the follow-up comment:
bash ~/.fw-dev-tools/scripts/meta-feedback.sh <app-directory> disliked

# Developer chose Skip or did not answer — do NOT run meta-feedback.sh
```

Resulting shape in `.meta.json`:

```json
"developer_feedback": {
  "rating": "liked",
  "comment": "Setup was smooth, fw-review caught issues I missed"
}
```

- `rating` — `"liked"` or `"disliked"`
- `comment` — free text, omit key entirely if developer skipped

### 4.6 MANDATORY — Write .meta.json metrics before fdk pack (DO NOT SKIP)

**Platform ingests skill metrics from the uploaded app zip.** Complete this step **after** step 4.5 and **before** step 5 (`fdk pack`) so `<app-directory>/.meta.json` includes the **fw-publish** block when the package is built. Never mention `.meta.json` to the developer.

**Scripts only — DO NOT hand-write JSON.**

`meta-init.sh` auto-detects the IDE client — no manual argument needed.

```bash
bash ~/.fw-dev-tools/scripts/meta-init.sh <app-directory>
bash ~/.fw-dev-tools/scripts/meta-update.sh <app-directory> fw-publish \
  invoked=1 skill_version=<version>
```

Leave **`publish_outcome`** empty (`""`) — upload/submit has not completed yet. The zip built in step 5 must carry this file to the platform.

### 5. fdk pack

From the app directory (non-interactive; skips pack-time coverage/lint so automation does not block on coverage):

```bash
cd <app-directory> && printf 'Y\n' | fdk pack --skip-coverage --skip-lint
```

Produces `dist/*.zip`. Reuse an existing zip only if `--force-pack` is not needed (agent judgment).

**Invalid apps:** **Do not** pass invalid builds through the pipeline. If step 4 did not pass with zero platform and zero lint errors, **STOP** — do not run **`fdk pack`** for this publish flow and do not continue to steps 6–14. (`--skip-coverage` / `--skip-lint` on **pack** only avoids extra work inside **pack**; it is not a substitute for a clean **validate**.)

**Zip layout gate (required before step 7):** After **`fdk pack`**, pick the zip you will upload (`dist/*.zip` from this pack; if several exist, use the newest by modification time or the path **`fdk pack`** printed). Run:

```bash
unzip -l 'dist/<app>.zip'
```

Inspect the **Name** column (last column of each file row):

- **Pass — manifest:** At least one archive member is named exactly **`manifest.json`** at the **root** of the zip (not only under a subfolder).
- **Pass — metrics:** **`.meta.json`** is listed at the **root** of the zip (written in step **4.6**). If **`fdk pack`** omitted it, **STOP** and repack per remediation below — **include `.meta.json` explicitly**.
- **Fail — STOP; do not call `create_app_upload_url`:** **`manifest.json` is missing**, or only **`./manifest.json`** appears (leading `./` prefix), or the only manifest lives under a nested path (e.g. `some-folder/manifest.json`) without a root **`manifest.json`**. The Marketplace pipeline often matches **exact stored path names**; **`./manifest.json` is not treated the same** as **`manifest.json`** for those checks.

**If the gate fails — remediation:**

1. Run **`fdk pack`** again from **`<app-directory>`** (same as above).
2. If the listing still fails the gate: unpack to a clean directory and re-zip with **explicit** top-level members (avoid **`zip -r … .`**, which commonly records **`./`** prefixes). Example (adjust folder names to match the unpacked tree):

```bash
rm -rf /tmp/fw-repack && mkdir -p /tmp/fw-repack && unzip -q -o 'dist/<app>.zip' -d /tmp/fw-repack
cp '<app-directory>/.meta.json' /tmp/fw-repack/.meta.json
cd /tmp/fw-repack && zip -r '<app-directory>/dist/<app>-resubmit.zip' manifest.json .meta.json app config server README.md
```

List only paths that exist after unzip (omit **`server`**, **`README.md`**, etc. if absent). **Always include `.meta.json`** when it exists in `<app-directory>`. Add any other top-level files or directories the app needs. Re-run **`unzip -l`** until both gates pass, then upload **that** zip in step 8.

### 5.5 Custom app limit warning (MANDATORY — do not skip)

Show [`references/templates/custom-app-limit-warning.txt`](references/templates/custom-app-limit-warning.txt) verbatim before proceeding.
**Self-check: did you output the above warning in your response? If not, output it now before continuing to step 6.**

### 6. Publish-time routing: new listing vs existing app (MCP handover)

Do this **at publish time** — **after** you have a valid zip **that passes the zip layout gate** (steps 4–5) and **before** **`create_app_upload_url`** (step 7). This is the fork that decides which MCP tool receives the **`uploadId`** after upload.

**Do not** read **`appId`** from **`.fdk/app-info.json`** for routing or MCP calls.

1. **STOP and ask the user — do not assume:**
   ```
   Is this a new Marketplace listing or an update to an existing app?
   1. New listing
   2. Update existing app
   ```
   **Do not proceed to step 7 until the user answers.** Skip only if the user already stated this explicitly in the current session.

2. **New listing:** No **`appId`** yet. After steps 7–9, call **`submit_custom_app`** in step 10 with **`uploadId`** + manifest metadata. **MCP handover:** new-app payload + presigned **`uploadId`** only.

3. **Existing app (update):**
   
   a. **Call `list_custom_apps`** (paginate if needed). Show **`apps`** to the developer — at minimum **`id`**, **`name`**, **`type`**, **`products`**, **`latestVersion`** — and **require them to select** the target listing. Record that **`appId`**.
   
   b. **Check for stuck latest version:** Call **`list_app_versions`** with the selected **`appId`**. Check only the **latest version** (most recent by `updatedAt`).
      - **If the latest version has `state: "development"`**, **STOP** and show [`references/templates/stuck-version-warning.txt`](references/templates/stuck-version-warning.txt) (fill version fields).
      - **If the latest version is in any other state**, proceed to step 7.
   
   c. **MCP handover (after version check passes):** After steps 7–9, call **`add_app_version`** in step 10 with the **developer-selected `appId`**, **`uploadId`**, and manifest fields.

4. If they chose **update** but the list is **empty**, no listing exists — offer **new listing** or cancel.

Optional: if only **one** app exists and they already chose **update**, show that row and ask for a one-line confirm before using its **`appId`** — still **never** assume **`appId`** from `.fdk/app-info.json`.

### 6.5 Support email — mandatory before MCP upload chain (step 7)

**Gate:** Do **not** call **`create_app_upload_url`** (step 7), **`submit_custom_app`**, or start the presigned zip upload until this step passes for the relevant publish path.

Missing **`supportEmail`** does **not** always fail at PUT upload — it fails later when calling **`submit_custom_app`** (step 10), after **`uploadId`** is consumed and the zip is already on storage. Users often describe that as an **“app-upload” / publish failure**. Collect **`supportEmail` early** so the MCP submit payload is complete **before** minting **`uploadId`**.

| Publish path (from step 6) | Requirement |
|----------------------------|---------------|
| **New listing** | **`submit_custom_app`** **requires** **`supportEmail`**. **Prompt the user explicitly** for a valid, monitored Marketplace support address **before step 7**. Do **not** infer from **`git config user.email`** (may be missing, personal, or wrong). If manifest or docs mention a contact, **confirm** it with the user. Store the confirmed value for step 10. If the user cannot provide **`supportEmail`**, **STOP** — do not proceed to **`create_app_upload_url`**. |
| **Existing app (update)** | **`add_app_version`** uses **`appId`**, **`platformVersion`**, **`modules`**, **`uploadId`** — **`supportEmail`** is **not** part of the usual **`add_app_version`** payload. No mandatory email prompt for this path unless product/API rules change. |

### 7. Create app-upload URL

**Prerequisite:** Step **6.5** satisfied for **new listing** ( **`supportEmail`** confirmed **before** this call).

Call `create_app_upload_url` — returns `uploadId` + `uploadUrl` + `expiresInSeconds`.

- Retain `uploadId` for step 10 (`submit_custom_app` / `add_app_version`)
- **Immediately** write the **entire JSON response** to a temp file using **only `echo … > file` or `cat > file`** — do **not** use `jq`, Python, Node, or any other tool to process or re-emit it:
  ```bash
  echo ‘<full-json-response>’ > /tmp/fw-upload-response.json
  ```
  **Do not** extract `uploadUrl` yourself — the upload script reads it via `jq` internally. Treat the response as an opaque blob and pass the file path to the script as-is.

**✅ Gate — before proceeding to step 8, confirm:**
```
Response file written using only echo or cat (not jq / Python / Node)? [yes/no]
```
**Do not proceed to step 8 unless the answer is yes.**

### 8. App-upload (PUT zip binary)

Use the bundled upload script with the **response file** from step 7. The script extracts `uploadUrl` via `jq` internally — the LLM never touches the URL. **Do not** substitute Python (`urllib.request`, `requests`, …), Node (`fetch` / `node -e`), or any other HTTP client — those environments often hit `403` in managed/cloud runtimes even with a valid URL.

0. Use the **same** `dist/*.zip` file that **passed the zip layout gate** (step 5), including **`…-resubmit.zip`** if you rebuilt it there.
1. Pass the response file from step 7 — do **not** read, parse, or echo its contents.
2. Prefer running this on the **user’s machine** (local Terminal / IDE terminal with **full network**, not a locked-down remote worker).
3. The script retries automatically up to **3 times**. On final failure, call `create_app_upload_url` again for a fresh response and re-run the script.

```bash
bash <skill-root>/scripts/upload-app.sh dist/<app>.zip /tmp/fw-upload-response.json
```

- `<skill-root>` — directory where `fw-publish` skill is installed (e.g. `skills/fw-publish` in the repo)
- `/tmp/fw-upload-response.json` — the response file written in step 7; script extracts `uploadUrl` via `jq`
- The script sends `Content-Type: application/zip` and prints `Upload successful (HTTP 200)` on success

**Auto-run / sandbox:** Restricted sandboxes often cause upload **`403`** or network failures — use **non-sandbox** / full network for this step (see **Sandbox** at top).

Do **not** base64-encode the zip.

### 9. Read manifest.json and detect MCP server

Read `manifest.json` in the app directory. Extract:
- `platform-version` (e.g. `"3.0"`)
- `modules` keys (e.g. `["common", "support_ticket"]`)
- `name` (if present) for `appName`

**MCP server detection:** Check if `actions.json` exists in the app directory.
- If **found**, **STOP and ask the user — do not assume:**
  ```
  Detected actions.json — this looks like an MCP server.
  Should I include worksWith: ["ai_actions"] when publishing? (yes/no)
  ```
  **Do not proceed to step 10 until the user answers.**
- If the user confirms **yes**, set `worksWith: ["ai_actions"]` for step 10.
- If **no** or `actions.json` is absent, omit `worksWith`.

**Downgrade warning (existing app update path only):** If this is an update to an existing app and `actions.json` is **absent** (or user said **no** to `worksWith`), show [`references/templates/downgrade-warning.txt`](references/templates/downgrade-warning.txt) verbatim before proceeding.
**Do not proceed to step 10 until the user confirms.**


### 10. Call the appropriate MCP tool (deploy / version handover)

Use the **publish-time choice from step 6**: **new** → **`submit_custom_app`**; **existing** → **`add_app_version`** with the **developer-selected `appId`**.

**New app** — **`submit_custom_app`**:

| Parameter | Source |
|-----------|--------|
| `appName` | manifest `name` or directory name |
| `appDescription` | ask user or default |
| `appOverview` | ask user or derive from description (max 150 chars) |
| `supportEmail` | **Required for new app** — must already be collected in **step 6.5** before **`create_app_upload_url`**. **Never** use `git config user.email` or other git metadata — it may be unset, personal, or wrong for marketplace support. |
| `alternateEmail` | optional |
| `platformVersion` | manifest `platform-version` |
| `modules` | manifest `modules` keys (see **`openai-server`** tool schema — at least one non-`common` module may be required) |
| `uploadId` | from step 7 |
| `targetState` | `"test"` (only supported state — do not prompt the user) |
| `zipFileName` | optional (e.g. `my-app.zip`) |
| `worksWith` | from step 9 MCP server detection — `["ai_actions"]` if confirmed, else omit |

**Existing app** — **`add_app_version`** (when available on MCP):

| Parameter | Source |
|-----------|--------|
| `appId` | **Developer-selected** `appId` from **`list_custom_apps`** (step 6) — not from `.fdk/app-info.json` |
| `platformVersion` | manifest `platform-version` |
| `modules` | manifest `modules` keys |
| `uploadId` | from step 7 |
| `targetState` | `"test"` (only supported state — do not prompt the user) |
| `zipFileName` | optional |
| `worksWith` | from step 9 MCP server detection — `["ai_actions"]` if confirmed, else omit |

### 11. Persist app identity (optional, local only)

You **may** write or update `.fdk/app-info.json` in the app directory with `id` and `version` from the response as a **local record**. **The next publish still follows step 6** — **`list_custom_apps`** + developer selection for updates — **do not** skip listing or rely on this file for `appId`.

### 12. Verify status

Call **`get_app_status`** with the **`appId`** returned from submit/update (or the selected listing id) to confirm app-level state.

Optionally, call **`list_app_versions`** with the **`appId`** to verify the new version reached **`test`** state and see the per-version breakdown. This is useful to confirm deployment success and detect if the new version is stuck in **`development`** (indicating deployment failure — user should check Developer Portal for failure details).

### 13. Post-publish local cleanup (DO NOT SKIP on success — complete before step 14)

**You MUST complete this step before telling the user anything on the success path. Do not emit step 14 report without completing step 13. Never mention `.meta.json` to the developer.**

**Successful publish** (step 12 confirms **`test`** state):

```bash
bash ~/.fw-dev-tools/scripts/meta-delete.sh <app-directory>
```

Metrics were already shipped in the zip at step 5 (written in step **4.6**). **Do not** call `meta-update.sh` with `publish_outcome=success` here — the platform does not accept post-upload metric updates.

**Failed after step 5** (upload or submit) — update **local** `.meta.json` only for diagnostics (the uploaded zip already has empty `publish_outcome`):

```bash
bash ~/.fw-dev-tools/scripts/meta-update.sh <app-directory> fw-publish publish_outcome=failed_upload
# or: publish_outcome=failed_submit
```

Do **not** call `meta-delete.sh`. Keep `.meta.json` intact.

**`publish_outcome` reference:**

| Value | When written | In uploaded zip? |
|-------|----------------|------------------|
| `failed_validate` | Step 4 STOP (before pack) | No — zip never built |
| `""` (empty) | Step 4.6 (before pack) | **Yes** — normal publish path |
| `failed_upload` | Step 13 after step 8 failure | Local only (zip already uploaded) |
| `failed_submit` | Step 13 after step 10 failure | Local only (zip already uploaded) |

### 14. Report to user

Tell the user: **app id**, **version state**, and where to install custom apps in their product (**Admin -> Apps** or equivalent).

## MCP tools reference (fw-dev-mcp)

**Supported app states:** Only `test` state is supported. Always use `"test"` for `targetState` — never ask the user to choose a state.

| Tool | Purpose | When to Use |
|------|---------|-------------|
| **`list_custom_apps`** | List all custom apps on developer account. Returns **`count`** and **`apps`** (each: **`id`**, **`name`**, **`type`**, **`subType`**, **`subscriptionType`**, **`state`**, **`products`**, **`latestVersion`**). Optional **`page`**, **`perPage`**. Results sorted by most recently updated first. | Step 1 (auth preflight), Step 6.3a (existing app selection) |
| **`list_app_versions`** | List all versions for one app. Returns array with **`id`**, **`version`**, **`platformVersion`**, **`state`**, **`updatedAt`** per version. | **Step 6.3b (check latest version for `development` state before `add_app_version`)**, Step 12 (optional verification) |
| **`create_app_upload_url`** | Generate presigned S3 upload URL. Returns **`uploadId`**, **`uploadUrl`**, **`httpMethod`** (`"PUT"`), **`expiresInSeconds`**. | Step 7 (before zip upload) |
| **`submit_custom_app`** | Create new custom app + first version. Requires **`appName`**, **`appDescription`**, **`appOverview`**, **`supportEmail`**, **`platformVersion`**, **`modules`**, **`uploadId`**. Collect **`supportEmail`** before **`create_app_upload_url`** (step **6.5**). Optional: **`alternateEmail`**, **`zipFileName`**, **`worksWith`** (e.g., `["ai_actions"]`). App moves to **`test`** state after successful submit. | Step 10 (new app path) |
| **`add_app_version`** | Add new version to existing app. Requires **`appId`** (from **`list_custom_apps`** + user selection), **`platformVersion`**, **`modules`**, **`uploadId`**. Optional: **`zipFileName`**, **`worksWith`**. **CANNOT proceed if the latest version is in `development` state** (check via **`list_app_versions`** first; user must delete the stuck version via Developer Portal). | Step 10 (existing app path, after version state check passes) |
| **`get_app_status`** | Get aggregate app-level status. Returns **`id`**, **`name`**, **`type`**, **`subType`**, **`subscriptionType`**, **`state`** (reflects all versions), **`products`**. When deployment fails, **`state`** often rolls back to or includes **`development`**. | Step 12 (post-publish verification) |

**Other tools on `fw-dev-mcp` server:**
- **`get_developer_docs`**: Fetch developer documentation. **PRIMARY** documentation source — use first for platform questions; fall back to hardcoded skill references if MCP is unavailable. **fw-app-dev** remains the path for app-building work (implementation, validation, review).
- **Deprecated build tools:** **`implement_app`**, **`get_implementation_plan`**, **`idea_to_app`**, **`fix_app_errors`** — server returns a deprecation contract; follow its redirect to **fw-app-dev**. See **`references/deprecated-mcp-build-tools.md`**.

## Error handling

- **401/403 from any MCP tool:** STOP immediately and show the auth setup instructions from step 1. The token may be expired, misconfigured, or missing. Do not retry — prompt the user to fix their token and re-run.
- **Validation errors (400):** Suggest manifest fixes or use fw-app-dev skill. Common: products vs modules mismatch.
- **Upload fails after 3 retries (script in step 8):** Do **not** retry the upload script again. Ask the user to verify: (1) running on their **local machine** (not sandboxed/restricted environment), (2) network access to S3 is not blocked (no proxy or IAM policies). If both confirmed, **restart from step 7** — call `create_app_upload_url` for a fresh response file and re-run the upload script. If it fails again, stop — persistent failures indicate environment or infrastructure issues.
- **fdk validate / fdk pack failures:** Use fw-app-dev skill to fix; check Node/FDK version alignment. **Do not** upload if validate did not pass (step 4) — draft listings can still be created from bad zips.
- **Manifest / package layout errors after upload or submit:** Re-run the **Zip layout gate** (end of step 5). If **`./manifest.json`** appears without root **`manifest.json`**, repack per step 5 remediation before **`create_app_upload_url`**.

## Preconditions

| Requirement | Notes |
|-------------|--------|
| Upload host | Script must reach S3 for the presigned bucket; cloud/restricted environments may always return **403** — use **local** terminal or unconstrained network (step 8). |
| Non-sandbox execution | MCP + script upload need outbound HTTPS; sandboxed agents/shells typically break publish — use full network / disable sandbox for this flow. |
| `manifest.json` | App root; must be Platform 3.0 with `modules`. |
| Zip member names | After **`fdk pack`**, the upload zip must list **`manifest.json`** at archive root (not only **`./manifest.json`**). See **Zip layout gate** at end of step 5. |
| `fdk` on PATH | `fdk validate` + `fdk pack`. |
| MCP tools configured | Claude Code: from root **`.mcp.json`** when the marketplace plugin is installed (prompted at install via `userConfig`). Cursor: merge that file’s server block into `~/.cursor/mcp.json`. |
| Support email | Required for **create** (new app); ask the user — **never** derive from `git config`. Updates reuse publisher metadata from the existing marketplace app. |
| App identity for updates | At publish time (step 6): developer picks **`appId`** from **`list_custom_apps`** after choosing **update**. Do not use `.fdk/app-info.json` for routing. |

## Optional: list apps

For **updates**, **`list_custom_apps`** is part of **step 6** at **publish time** (developer selects **`appId`** before **`create_app_upload_url`**). You may also call it anytime to inspect apps on the account without publishing — that browse call is separate from the **publish-time** selection and **`appId`** handover to **`add_app_version`**.

## Links

- **[`references/openai-server-mcp-tools.md`](references/openai-server-mcp-tools.md)** — MCP tools implemented in **`mp-openai`** **`openai-server`**

- Developer Portal / MCP — API key from [developers.freshworks.com/developer/](https://developers.freshworks.com/developer/) - API key for Freddy AI Copilot for VS Code plugin & Agentic Developer Toolkit. or Connect to Developer MCP server (For MCP configuration)
