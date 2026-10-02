# fw-review

Automated **Freshworks Platform 3.0** marketplace app audit: manifest and iparams review, frontend rules, deterministic `checks/*.js` rule checks (with shared CLI/result plumbing in `runners/common.js`), and a fixed **App Review Result** report format.

## Overview

**fw-review** is a silent, pipeline-style skill. Agents follow `SKILL.md`, evaluate the rule IDs listed here, run mapped rule scripts from `checks/` (each importing shared plumbing from `runners/common.js`) where specified, and emit output per `rules/report.md`. It does not install FDK; use **fw-setup** (`/fw-setup-status`) when the CLI may be absent. To fix findings, use **fw-app-dev** (full Platform 3.0 apps) or **fw-ai-actions-app** (AI Actions) per **[AGENTS.md](../../AGENTS.md)**.

## Install

### Install via CLI

```bash
npx @freshworks/fw-dev-tools install
```

**Local clone:**

```bash
npx @freshworks/fw-dev-tools install --yes
```

### Install as Claude plugin

**Step 1**

```bash
claude plugin marketplace add freshworks-developers/fw-dev-tools
```

**Step 2**

```bash
claude plugin install fw-review@freshworks-developers
```

## Rule Inventory

| Rule ID | Area | Source | Summary |
|---------|------|--------|---------|
| IP-04A | Installation parameters | `rules/iparam-rules.md` | Protocol must not be accepted in domain or host fields. |
| IP-05A | Installation parameters | `rules/iparam-rules.md` | Installation inputs must have thorough validation. |
| IP-06A | Installation parameters | `rules/iparam-rules.md` | Validation failures must show helpful, specific messages. |
| FFS-02L | File and folder structure | `rules/script-check-rules.md`, `checks/external-import-sources.js` | External imports must use allowlisted hosts. |
| FFS-04L | File and folder structure | `rules/script-check-rules.md`, `checks/https-imports.js` | External imports must use HTTPS. |
| FFS-05L | File and folder structure | `rules/script-check-rules.md`, `checks/image-resolution.js` | Image assets must meet baseline resolution expectations. |
| FF-01L | Frontend | `rules/frontend-files-rules.md` | Client API calls must use request templates instead of raw Ajax/fetch/HTTP clients. |
| FF-07L | Frontend | `rules/frontend-files-rules.md`, `rules/script-check-rules.md`, `checks/oauth-config-usage.js` | OAuth client IDs, secrets, and tokens must stay in secure configuration. |
| FF-02M | Frontend | `rules/frontend-files-rules.md` | SMI must not be used when request templates are sufficient. |
| FF-03A | Frontend | `rules/frontend-files-rules.md` | API secrets must appear in request headers, not URLs. |
| FF-04A | Frontend | `rules/frontend-files-rules.md` | API errors must be handled and reported to users. |
| FF-05A | Frontend | `rules/frontend-files-rules.md` | List API calls must use pagination when supported. |
| FF-06A | Frontend | `rules/frontend-files-rules.md` | Source code must not hardcode credentials or secrets. |
| CR-05L | Code readability | `rules/script-check-rules.md`, `checks/unused-library-imports.js` | Imported third-party libraries must be used. |
| GN-02L | Miscellaneous | `rules/script-check-rules.md`, `checks/fdk-errors-warnings.js` | FDK validation must not report errors or warnings. |
| GN-08L | Miscellaneous | `rules/script-check-rules.md`, `checks/freshworks-css-only.js` | Only Freshworks CSS should be referenced. |
| GN-12L | Miscellaneous | `rules/script-check-rules.md`, `checks/platform-version-upgrade.js` | App must target the expected platform version. |

## Script Output Contract

Script-backed checks are deterministic Node CLIs. Each rule check lives in `checks/` and uses the shared CLI/result plumbing in `runners/common.js`. Each script takes an app root path and prints JSON:

```bash
node checks/<script-name>.js /path/to/app
```

Each script returns a JSON object with this shape:

```json
{
  "internal": {
    "rule_id": "FFS-02L",
    "visibility": "internal"
  },
  "passed": true,
  "summary": "Human-readable summary",
  "details": []
}
```

Important:

- `internal.rule_id` is internal metadata only.
- The user-facing review output must not show `internal.rule_id`.
- `passed`, `summary`, and `details` are intended for downstream evaluation and report generation.

Shared helper in `runners/common.js` (imported by every file in `checks/` as `require('../runners/common')`):

- `createRuleResult(ruleId, passed, summary, details)` wraps the script result and stores the rule ID under `internal.rule_id`.
- `runCli(run)` resolves the target directory from `process.argv[2] || process.cwd()`, runs the checker, prints formatted JSON, and sets the process exit code to `0` for pass and `1` for fail.

## Shared Script Behavior

Most scripts use the same recursive scan approach:

- Start from the provided app root.
- Recursively walk subdirectories with `fs.readdir(..., { withFileTypes: true })`.
- Skip `.cache`, `.cursor`, `.fdk`, `.git`, `.next`, `build`, `coverage`, `dist`, and `node_modules`.
- Normalize output paths with forward slashes.
- Read files as UTF-8 text unless the script only needs file stats.

## Detailed Rules And Implementation

### Installation Parameters

Installation-time configuration review is scoped to `manifest.json`, default iparams (`config/iparams.json` or `config/iparams.yaml`), custom settings UI (`config/iparams.html`, `config/assets/iparams.js`, and related `config/` assets), and install lifecycle consistency in `server/server.js`. Read `manifest.json` first, then determine whether the app uses default iparams or custom iparams; do not assume both exist.

#### IP-04A - Protocol Must Not Be Accepted In Domain Or Host Fields

**Goal:** Values meant to be hostnames must not accept `http://` or `https://`. Domain and host fields should contain only the hostname.

**Inspect:** Check default iparam fields whose name, description, or hint indicates domain, host, base URL, or endpoint host. For custom iparams, inspect JavaScript validation for string checks, regexes, trimming, and protocol rejection.

**Implementation details:**

- Read `manifest.json` first so product modules, install flow, and config expectations are understood before iparam review.
- Inspect default iparam schemas in `config/iparams.json` or `config/iparams.yaml`.
- Inspect custom UI files such as `config/iparams.html` and `config/assets/iparams.js`.
- Identify fields by names and copy such as `domain`, `host`, `baseUrl`, `base_url`, `url`, `endpoint`, `subdomain`, descriptions, hints, and placeholders.
- For JSON/YAML iparams, check whether `regex`, `type`, `description`, `hint`, and `error` enforce host-only values.
- For custom JS, check submit-time validation before `postConfigs`, including `trim()`, regex checks, and explicit rejection or normalization of `http://` and `https://`.

#### IP-05A - Thorough Validation Of Installation Inputs

**Goal:** Every install-time field must be required when needed and constrained by type, regex, choices, or custom validation.

**Inspect:** For default iparams, review `required`, `type`, `regex`, `secure`, and dropdown choices. For custom iparams, review validation before `postConfigs` or save. Also check `manifest.json` and `server/server.js` when non-empty iparams imply install-time validation.

**Implementation details:**

- Detect whether default iparams, custom iparams, or both are present.
- Treat both non-empty `iparams.json` and custom `iparams.html` as a possible conflict unless there is a clear single source of truth.
- For each field, decide whether it should be required based on app behavior, API needs, OAuth setup, and install flow.
- Check type constraints for strings, numbers, dropdowns, checkboxes, secure fields, and OAuth iparams.
- Check format-sensitive fields for regex or equivalent JS validation: email, host/domain, URL path, numeric ID, API token shape, workspace ID, account ID, or region.
- When iparams are non-empty and install validation is needed, verify `manifest.json` declares `onAppInstall` and `server/server.js` implements the referenced handler.
- If `oauth_config.json` exists, verify `oauth_iparams` are defined with useful types and required flags.

#### IP-06A - Helpful, Specific Validation Error Messages

**Goal:** Validation failures must tell the admin what went wrong and how to fix it.

**Inspect:** In default iparams, check `"error"` strings next to regex or validation metadata. In custom iparam JS, check user-visible toast, inline, or save error messages.

**Implementation details:**

- For default iparams, pair each `regex` or constrained input with a nearby `error` message.
- For custom iparams, trace each validation branch and confirm it returns or displays a user-visible message before save is blocked.
- Check that messages explain expected format, not only that a value is invalid.
- Review `display_name`, `description`, `hint`, placeholder, and validation copy together so the admin sees consistent guidance.
- Treat `console.error`, silent `return false`, or generic text such as `Invalid` as insufficient for user-facing validation.

### File And Folder Structure

#### FFS-02L - Dependencies From External Sources Must Use Allowlisted Hosts

**Implemented by:** `checks/external-import-sources.js`

**File types scanned:** `.css`, `.html`, `.js`, `.json`, `.jsx`, `.ts`, `.tsx`

**Goal:** External script and stylesheet imports must come from known allowlisted delivery hosts.

**Implementation details:**

- Detect externally hosted imports and fail when the hostname is not in the allowlist.
- For npm-backed CDN or registry URLs, also fail when the package name does not match declared app dependencies.
- Treat host allowlisting as an infrastructure check only, not a package safety guarantee.

**Patterns used:**

- HTML attributes: `/(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi`
- CSS imports and URLs: `/(?:url|@import)\s*\(\s*["']?(https?:\/\/[^"')]+)["']?\s*\)/gi`

**Validation flow:**

1. Scan each eligible text file.
2. Extract matching `http://` or `https://` URLs from `src`, `href`, `url(...)`, and `@import`.
3. De-duplicate URLs per file with a `Set`.
4. Parse the hostname using `new URL(urlValue)`.
5. If URL parsing fails, fall back to `/^https?:\/\/([^/:?#]+)/i`.
6. Compare the hostname against the external-host allowlist.
7. Accept a source when `hostname === allowlistedDomain` or `hostname.endsWith('.' + allowlistedDomain)`.
8. Read dependency declarations from `manifest.json` dependencies and `package.json` dependencies, devDependencies, peerDependencies, and optionalDependencies.
9. If the allowlisted host is npm-backed, extract the package name from the URL.
10. When a package name is extracted and there is at least one declared dependency, fail if the package is not declared.

**Allowlisted external hosts:** `ajax.googleapis.com`, `cdn.freshdev.io`, `cdn.jsdelivr.net`, `cdnjs.cloudflare.com`, `code.jquery.com`, `esm.sh`, `fonts.googleapis.com`, `fonts.gstatic.com`, `ga.jspm.io`, `maxcdn.bootstrapcdn.com`, `npm.jspm.io`, `registry.npmjs.org`, `stackpath.bootstrapcdn.com`, `static.freshdev.io`, `unpkg.com`

**NPM-backed hosts with package-name validation:** `cdn.jsdelivr.net`, `esm.sh`, `ga.jspm.io`, `npm.jspm.io`, `registry.npmjs.org`, `unpkg.com`

**Package extraction examples:**

- `https://cdn.jsdelivr.net/npm/react@18/...` -> `react`
- `https://unpkg.com/lodash@4/...` -> `lodash`
- `https://esm.sh/@scope/pkg@1.2.3` -> `@scope/pkg`
- `https://ga.jspm.io/npm:react@18/index.js` -> `react`
- `https://registry.npmjs.org/@scope%2fpkg/-/pkg-1.0.0.tgz` -> `@scope/pkg`

**Details emitted:**

- Adds a detail when the external source hostname is not allowlisted.
- Adds a detail when the URL is malformed and no hostname can be extracted.
- Adds a detail when an npm-backed external import points to a package that is not declared in app dependencies.

**Security nuance:** Allowlisting these hosts does not mean packages served from them are inherently safe. Package safety still depends on package-level controls such as approved package allowlists, pinned versions, integrity verification, and review process.

#### FFS-04L - Imports Must Use HTTPS

**Implemented by:** `checks/https-imports.js`

**Implementation details:**

**File types scanned:** `.css`, `.html`, `.js`, `.json`, `.jsx`, `.ts`, `.tsx`

**Goal:** External script and style imports must use `https://`, not `http://`.

**Patterns used:**

- HTML attributes: `/(?:src|href)\s*=\s*["']http:\/\/[^"']+/gi`
- CSS: `/(?:url|@import)\s*\(\s*["']?http:\/\/[^"')]+/gi`

**Validation flow:**

1. Walk all eligible files.
2. Run both regexes against file content.
3. For every match, compute the line number from the byte offset.
4. Capture the full trimmed line as the excerpt.
5. Emit a failure detail for each insecure match.

**Details emitted:** Adds one detail per insecure match, including the relative file path, line number, message, and trimmed line excerpt.

#### FFS-05L - Images Must Meet Baseline Resolution Expectations

**Implemented by:** `checks/image-resolution.js`

**Implementation details:**

**Image file types discovered:** `.gif`, `.ico`, `.jpeg`, `.jpg`, `.png`

**SVG file checked:** `icon.svg`

**Goal:** App icon and logo assets should satisfy baseline production-readiness checks.

**Validation flow:**

1. Recursively collect asset paths from the app root.
2. Skip ignored folders such as `node_modules`, `dist`, `.git`, and `.fdk`.
3. For `.gif`, `.ico`, `.jpeg`, `.jpg`, and `.png` files, fail when file size is greater than `0` and less than `1024` bytes and the relative path contains `icon` or `logo`.
4. Find `icon.svg`.
5. Read `width` and `height` attributes from `icon.svg`.
6. Fail when `icon.svg` declares dimensions other than `64x64`.

**Details emitted:** Adds a detail for each suspicious icon/logo image with file path and size, and adds a detail for `icon.svg` when declared dimensions are not `64x64`.

**Notes:** The script does not inspect actual PNG/JPEG dimensions, screenshot size, upload type allowlists, upload size limits, count limits, or S3-safe filenames.

### Frontend

#### FF-01L - Request Templates Vs Ajax / Fetch / Third-Party HTTP Clients

**Goal:** Client-side code that talks to product or custom APIs must use the platform Request API, request templates in `config/requests.json`, and `client.request.invoke` or `client.request.invokeTemplate`, not raw Ajax, `axios`, `fetch()`, or `XMLHttpRequest`, unless clearly justified.

**Inspect:** Review product-facing UI and client bundles under paths such as `app/`, `src/`, and HTML/JS loaded in the product. Serverless `server/` code can use `axios`, `fetch`, or other HTTP clients for outbound calls, so judge ambiguous files by runtime context.

**Implementation details:**

- Inspect product-facing frontend paths such as `app/`, `src/`, sidebar scripts, modal scripts, and HTML-loaded JavaScript.
- Search for `$.ajax`, `axios`, `fetch(`, `new XMLHttpRequest`, and other direct HTTP clients in client runtime code.
- Compare each API call with `config/requests.json` to decide whether a request template should exist.
- Check for `client.request.invoke` or `client.request.invokeTemplate` usage when request templates are already configured.
- Do not fail serverless `server/` code just because it uses HTTP clients; decide based on whether the code runs in the browser or server.
- Allow clearly non-API usage such as fetching a static local asset only when the context is obvious.

#### FF-07L - OAuth Client ID And Secrets Only In OAuth / Secure Config

**Implemented by:** `checks/oauth-config-usage.js` plus frontend review criteria.

**Implementation details:**

**File types scanned:** `.env`, `.html`, `.js`, `.json`, `.jsx`, `.ts`, `.tsx`

**Goal:** OAuth client IDs, client secrets, and long-lived OAuth tokens must appear only in intended secure configuration such as `config/oauth_config.json`, secure iparams, encrypted fields, or request template iparam bindings.

**Regex patterns used:**

- `/client[_-]?id\s*[:=]\s*['"][^'"]{10,}['"]/gi`
- `/client[_-]?secret\s*[:=]\s*['"][^'"]{10,}['"]/gi`
- `/oauth[_-]?token\s*[:=]\s*['"][^'"]{10,}['"]/gi`

**Config-file exemption:** A file is treated as config when its relative path matches `/oauth_config\.json$|config\/|config\\|iparams\.json$|\.env$/i`.

**Comment-line exemption:** A matched line is ignored when it starts with `//`, `/*`, or `*`.

**Validation flow:**

1. Walk eligible files.
2. Skip files considered config locations.
3. Run the three OAuth regexes on remaining files.
4. For each match, compute line number and excerpt.
5. Ignore matches on obvious comment lines.
6. Emit a failure detail for the remaining matches.

**Details emitted:** Adds one detail per OAuth-looking value outside approved config paths, including relative file path, line number, message, and trimmed line excerpt.

**Notes:** The `{10,}` minimum length is a heuristic to reduce obvious false positives. This check is text-based and does not evaluate runtime behavior.

#### FF-02M - SMI Must Not Be Used When Request Templates Will Suffice

**Goal:** Server Method Invocation should not be used when the method only proxies to `$request.invokeTemplate()`.

**Inspect:** Review SMI functions in `server/server.js` and compare them with request templates. Event handlers are not judged by this rule.

**Implementation details:**

- Inspect exported SMI handlers in `server/server.js`.
- Identify functions that only call `$request.invokeTemplate()` and return or resolve that result without additional server-side logic.
- Compare the invoked template name with entries in `config/requests.json`.
- Treat pass-through functions as replaceable by direct `client.request.invokeTemplate()` calls.
- Do not apply this rule to event handlers such as install, uninstall, external event, ticket, or conversation handlers.
- Consider SMI justified when it performs meaningful logic such as request orchestration, validation, transformation, pagination aggregation, product-event handling, or secure server-only operations.

#### FF-03A - API Secrets Must Only Appear In Request Headers, Not URLs

**Goal:** Credentials must be sent in request headers, never in URL query parameters.

**Inspect:** Review `config/requests.json` and API call templates for query parameters such as `?api_key=<%= iparam.api_key %>`.

**Implementation details:**

- Inspect every request template URL in `config/requests.json`.
- Search URL query strings for credential-like names such as `api_key`, `apikey`, `token`, `access_token`, `secret`, `password`, `auth`, and `key`.
- Check whether those values are bound from iparams or hardcoded literals.
- Confirm credentials are instead sent through the request template `headers` object.
- Treat path or query parameters as acceptable only when they are non-secret identifiers and not authentication material.

#### FF-04A - API Errors Must Be Handled And Reported To Users

**Goal:** API and platform interface failures must be caught and shown to the user.

**Inspect:** Review `client.request.invoke()`, `client.request.invokeTemplate()`, `client.db.get()`, `client.db.set()`, and other FDK interfaces for `.catch()` blocks, error callbacks, and user-visible notifications.

**Implementation details:**

- Search frontend code for platform calls such as `client.request.invoke`, `client.request.invokeTemplate`, `client.db.get`, `client.db.set`, `client.iparams.get`, and similar promise-returning FDK interfaces.
- For promise chains, verify `.catch(...)` exists and is not empty.
- For `async/await`, verify calls are wrapped in `try/catch` or otherwise surfaced to a central error handler.
- Check that the error path shows a user-visible notification, inline error, modal message, or equivalent product UI feedback.
- Treat `console.error`, swallowed errors, or comments without user feedback as failures.

#### FF-05A - Pagination Must Be Utilised When The API Supports It

**Goal:** List API calls must implement pagination when the API supports it.

**Inspect:** Review list endpoints and collection fetches for pagination parameters, loops, next-page handling, or documented bounds.

**Implementation details:**

- Identify list-style API calls by endpoint shape and naming, such as tickets, contacts, users, conversations, companies, records, search results, or reports.
- Check whether the API supports pagination through `page`, `per_page`, `limit`, `offset`, cursor, `next_page`, `next`, or link headers.
- Verify the implementation requests bounded pages and iterates until all required data is fetched or until a documented limit is reached.
- Fail single large or unbounded requests that assume all records are returned in one response.
- Treat a rule as not applicable when no list API call exists or when the API endpoint is documented as non-paginated and bounded.

#### FF-06A - No Hardcoded Credentials Or Secrets In Source Code

**Goal:** API keys, passwords, tokens, and credentials must not be hardcoded in source files.

**Inspect:** Review source files for literal secrets. Values should come from `client.iparams.get()`, request template iparam bindings, secure app settings, or approved config.

**Implementation details:**

- Search frontend and shared source files for credential-like names and literal values: `apiKey`, `api_key`, `token`, `secret`, `password`, `bearer`, `authorization`, `clientSecret`, and similar names.
- Check JavaScript, TypeScript, HTML, JSON, and request-related code that ships with the app.
- Treat long random-looking strings, bearer tokens, basic auth values, private keys, and hardcoded passwords as failures unless clearly placeholder-only and non-production.
- Verify secrets are read from secure iparams, developer app settings, request template bindings, or approved configuration instead of source literals.
- Do not expose the full secret in the final report; cite the file and line while redacting sensitive values when needed.

### Code Readability

#### CR-05L - Imported Third-Party Libraries Must Be Used

**Implemented by:** `checks/unused-library-imports.js`

**Implementation details:**

**File types scanned:** `.js`, `.jsx`, `.ts`, `.tsx`

**Goal:** Imported third-party libraries should be used in the file that imports them.

**Import patterns used:**

- CommonJS: `/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g`
- ES modules: `/import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/g`

**Validation flow:**

1. Walk JS/TS files.
2. Extract imported identifier and source from `require(...)` and `import ... from ...`.
3. Skip relative imports when `source.startsWith('.')`.
4. Escape the identifier with `escapeRegExp(...)`.
5. Count identifier occurrences using `new RegExp('\\b' + escapedIdentifier + '\\b', 'g')`.
6. If the identifier appears only once, treat it as unused because the single occurrence is the import statement itself.
7. Emit a failure detail with the import statement as the excerpt.

**Details emitted:** Adds one detail per apparently unused third-party import, including the relative file path and import statement excerpt.

**Known limitations:** This is a regex-based check. It does not fully analyze named imports, namespace imports, destructuring, side-effect-only imports, or alias-heavy import patterns.

### Miscellaneous

#### GN-02L - FDK Validation Must Not Report Errors Or Warnings

**Implemented by:** `checks/fdk-errors-warnings.js`

**Implementation details:**

**Command executed:** `fdk validate`

**Goal:** `fdk validate` should complete without errors or warnings.

**Validation flow:**

1. Run `fdk validate` with the provided app root as the working directory.
2. Collect stdout and stderr.
3. Strip ANSI color codes.
4. Extract non-empty lines containing `error`, `warning`, or `warn`.
5. Ignore success summaries such as `0 errors` and `0 warnings`.
6. Fail when `fdk validate` exits unsuccessfully or warning/error lines are present.
7. Return at most the first 10 output issue lines in `details`.

**Timeout:** Fails if `fdk validate` does not finish within `120` seconds.

**FDK availability:** Fails with a clear message when `fdk` is not available on `PATH`.

**Details emitted:** Adds details from warning/error output lines. If no warning/error lines are parsed but validation failed, it falls back to the first non-empty output lines, capped at 10.

#### GN-08L - Only Freshworks CSS Should Be Referenced

**Implemented by:** `checks/freshworks-css-only.js`

**Implementation details:**

**File types scanned:** `.css`, `.html`

**Goal:** Product-specific CSS bundles should not be referenced; only Freshworks CSS should be used.

**Regex patterns used:**

- Link tags: `/<link[^>]+href\s*=\s*["']([^"']+\.css)["']/gi`
- CSS imports: `/@import\s+(?:url\()?\s*["']([^"']+\.css)["']/gi`

**Blocked CSS file names:** `freshdesk.css`, `freshmarketer.css`, `freshsales.css`, `freshservice.css`, `freshteam.css`

**Validation flow:**

1. Walk HTML and CSS files.
2. Extract `.css` references from link tags and `@import`.
3. Lowercase the matched reference.
4. Fail when the reference contains any blocked CSS file name.

**Matching behavior:** Uses `href.includes(cssFile)` style matching after lowercasing. This detects local paths, CDN paths, and nested asset URLs when the blocked file name appears in the string.

**Details emitted:** Adds one detail per blocked CSS reference, including the relative file path and the matched CSS filename or path.

#### GN-12L - App Must Target The Expected Platform Version

**Implemented by:** `checks/platform-version-upgrade.js`

**Implementation details:**

**File read:** `manifest.json`

**Constant used:** `EXPECTED_PLATFORM_VERSION = 3.0`

**Goal:** The app must declare a platform version and that version must be at least the expected minimum.

**Validation flow:**

1. Read and parse `manifest.json`.
2. Fail immediately if the manifest is missing or if `platform-version` is absent.
3. Parse the declared version with `Number.parseFloat(String(manifest['platform-version']))`.
4. Fail when parsing results in `NaN` or the parsed value is below `3.0`.

**Details emitted:** Adds a detail against `manifest.json` explaining whether the platform version is missing, unparsable, or below the expected `3.0` threshold.

**Notes:** This script only validates the version threshold. It does not validate broader manifest structure.

## What's Included

| Path | Purpose |
|------|---------|
| `SKILL.md` | Workflow, authoritative rule ID summary, prerequisites |
| `rules/` | Detailed criteria for iparam, frontend, script-backed checks, and report output |
| `checks/` | One Node CLI per script-backed rule ID listed in the rule inventory |
| `runners/` | Shared CLI/result plumbing (`runners/common.js` exporting `createRuleResult` and `runCli`) imported by every check |
| `.claude-plugin/` / `.cursor-plugin/` | Plugin metadata for marketplace installs |

## Requirements

- Target app: Platform 3.0 marketplace layout (`manifest.json`, `config/`, `app/`, etc.)
- **FDK** on `PATH` when phases require `fdk` (otherwise install via **fw-setup**)
- **Node.js** to run `checks/*.js` (same machine as the audit)

## Support

- [Freshworks Developer Docs](https://developers.freshworks.com/)
- [GitHub issues](https://github.com/freshworks-developers/fw-dev-tools/issues)

## License

MIT (same as this repository).
