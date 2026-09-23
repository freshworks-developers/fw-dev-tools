# openai-server MCP tools (fw-dev-mcp)

**Hosted endpoint:** `https://mcp.freshworks.dev/mcp`  

**Agent routing:** Use **fw-app-dev** for app development. Use **fw-publish** `SKILL.md` for publish orchestration. **`get_developer_docs`** is the **PRIMARY** documentation source; fall back to hardcoded skill references if MCP is unavailable.

**MCP boundary:** Build, fix, review, and migrate via **skills only** — not MCP. Legacy build tools (`implement_app`, `get_implementation_plan`, `idea_to_app`, `fix_app_errors`) are deprecated; the server returns a redirect contract. See **`deprecated-mcp-build-tools.md`**.

---

## `list_custom_apps`

List custom apps (`type=custom`) for the authenticated developer. Sorted by `updated_at` desc.


| Parameter | Type    | Required | Default | Description         |
| --------- | ------- | -------- | ------- | ------------------- |
| `page`    | integer | no       | 1       | 1-based page number |
| `perPage` | integer | no       | 10      | Page size           |


**Returns:** `{ "count": number, "apps": [ { "id", "name", "type", "subType", "subscriptionType", "state", "products" }, ... ] }`

---

## `create_app_upload_url`

Mint presigned S3 URL for zip upload. Call **before** `submit_custom_app` or `add_app_version`.

**Parameters:** none

**Returns:**


| Field              | Description                             |
| ------------------ | --------------------------------------- |
| `uploadId`         | Opaque id for submit/update             |
| `uploadUrl`        | Presigned URL — **HTTP PUT** zip binary |
| `httpMethod`       | Always `"PUT"`                          |
| `expiresInSeconds` | URL TTL                                 |
| `instructions`     | Human-readable curl hint                |


**Workflow:** `fdk pack` → this tool → PUT zip → pass `uploadId` to submit/update.

---

## `submit_custom_app`

Create a **new** custom app + first version (Platform **3.x** only). Target state: `**test`** (fixed server-side).


| Parameter         | Type     | Required | Description                                                      |
| ----------------- | -------- | -------- | ---------------------------------------------------------------- |
| `appName`         | string   | yes      | Display name, 2–50 characters                                    |
| `appDescription`  | string   | yes      | Plain text, non-empty                                            |
| `appOverview`     | string   | yes      | Tagline, max 150 characters                                      |
| `supportEmail`    | string   | yes      | Publisher support email                                          |
| `alternateEmail`  | string   | no       | Secondary email                                                  |
| `platformVersion` | string   | yes      | From manifest, e.g. `"3.0"`                                      |
| `modules`         | string[] | yes      | Top-level `manifest.json` `modules` keys; ≥1 non-`common` module |
| `uploadId`        | string   | yes      | From `create_app_upload_url` after PUT                           |
| `zipFileName`     | string   | no       | e.g. `my-app.zip`                                                |
| `worksWith`       | string[] | no       | e.g. `["ai_actions"]` for MCP servers                        |


**Returns:** `{ "message", "idempotentReplay"?, "idempotencyNote"?, "app": { ... includes latestVersion } }`

---

## `add_app_version`

Add version to an **existing** app. Blocked if latest version is `**development`** (check via `list_app_versions`).


| Parameter         | Type     | Required | Description                              |
| ----------------- | -------- | -------- | ---------------------------------------- |
| `appId`           | long     | yes      | From `list_custom_apps` + user selection |
| `platformVersion` | string   | yes      | From manifest                            |
| `modules`         | string[] | yes      | Updated manifest module keys             |
| `uploadId`        | string   | yes      | After PUT to presigned URL               |
| `zipFileName`     | string   | no       | Optional                                 |
| `worksWith`       | string[] | no       | e.g. `["ai_actions"]`                    |


**Returns:** Same shape as `submit_custom_app`.

---

## `list_app_versions`

Per-version rows for one app.


| Parameter | Type | Required |
| --------- | ---- | -------- |
| `appId`   | long | yes      |


**Returns:** `{ "appId", "count", "versions": [ { "id", "versionNumber", "platformVersion", "state", "updatedAt" }, ... ] }`

---

## `get_app_status`

Aggregate app-level snapshot (`state` reflects all versions).


| Parameter | Type | Required |
| --------- | ---- | -------- |
| `appId`   | long | yes      |


**Returns:** `{ "id", "name", "type", "subType", "subscriptionType", "state", "products" }`

---

## `get_developer_docs` (primary)

RAG retrieval of Freshworks marketplace development docs.


| Parameter         | Type   | Required | Description                     |
| ----------------- | ------ | -------- | ------------------------------- |
| `query`           | string | yes      | What you need help with         |
| `platformVersion` | string | no       | `"v2"` or `"v3"` (default `v3`) |


**Returns:** Markdown documentation string (sections separated by `---`).

**fw-dev-tools policy:** **PRIMARY** source for platform documentation questions — use first, fall back to hardcoded skill references if MCP is unavailable. **fw-app-dev** remains the primary path for app-building work (implementation, validation, review); this tool is for doc lookup, not implementation routing.
