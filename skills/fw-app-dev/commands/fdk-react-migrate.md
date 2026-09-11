---
name: fdk-react-migrate
description: Migrate an existing Platform 3.0 vanilla JS app to React Meta framework. Preserves server/config; adds metaConfig, DEW, React structure, and React Router.
globs: ["**/manifest.json", "**/app/**/*.js"]
always: false
---

# FDK React Migrate — Vanilla JS → React Meta

**Usage:** `/fdk-react-migrate`

Converts a **Platform 3.0** vanilla JS app (Crayons + `app/scripts/app.js`) to the **Meta framework** with React + DEW.

**Not for Platform 2.x:** If `platform-version` is not `"3.0"`, run **`/fdk-migrate`** first, then return to this command.

## Step 1: Locate app and verify platform version

1. Find `manifest.json` in the workspace.
2. If multiple apps → ask user which to migrate.
3. Read `platform-version`:
   - **Not `"3.0"`** → STOP → **`/fdk-migrate`** first.
   - **`metaConfig.framework` already `"react"`** → inform user; offer `/fdk-fix` only.

## Step 2: Prerequisites

Follow **SKILL.md** toolchain gate: Node **24.x** + FDK **10.x** (**10.1.0+** for Meta).

## Step 3: Inventory existing app

Document before changing files:

- **Locations** and HTML shells (`app/index.html`, multi-placeholder names)
- **Server** handlers in `server/server.js` — keep all needed SMI/events
- **`config/requests.json`**, **`oauth_config.json`**, **`iparams.json`** or **`iparams.html`** (+ `config/assets/` if custom)
- **Frontend logic** in `app/scripts/app.js` — map to React components

See **`references/react-meta/js-to-react-migration-checklist.md`**.

## Step 4: Add Meta manifest + package

1. Add to **`manifest.json`**:
   ```json
   "metaConfig": {
     "framework": "react",
     "packageManager": "npm"
   }
   ```
2. Raise **`engines.fdk`** to **`10.1.0`** minimum if lower.
3. Create/update **`package.json`**:
   - `react`, `react-dom` (^19)
   - `@freshworks/dew-components`, `@freshworks/dew-styles`
   - `react-error-boundary`, `react-router-dom`
   - Preserve other legitimate deps (axios manifest-pinned, etc.)

## Step 5: Restructure frontend

1. **Keep** `app/index.html` at app root (update to `#root` shell; retain `{{{appclient}}}` if SMI/Data/Request used).
2. **Remove** Crayons CDN scripts from HTML.
3. Create **`app/index.jsx`** + **`app/mount.jsx`** — import DEW tokens via `app/styles/app.css`; wrap `<App />` in **`react-error-boundary`**; **do not** wrap root in `<DewTheme>` (not a React component)
4. Move UI logic from **`app/scripts/app.js`** into **`app/components/`** as React components.
5. Add **React Router** with `path="*"` home route and `/app/...` feature routes — **specific `/app/...` routes before the `path="*"` catch-all**.
6. **Remap all navigation paths (CRITICAL — UI breaks if skipped):**
   - Grep `app/` for old paths: `href=`, `window.location`, `navigate(`, `<Link to=`, click handlers that change views.
   - Map each vanilla page/view to a React Router route under **`/app/...`** (e.g. `/demo` → `/app/demo`).
   - Add a matching `<Route path="/app/...">` for every feature page; update every `Link` / `navigate()` to the new path.
   - Do **not** leave stale vanilla-only paths — `fdk validate` can pass while the UI stays blank or routes fail.
7. **Multi-location HTML:** For **each** manifest `location.url` (e.g. `index.html`, `ticketSidebar.html`), ensure the file exists at **`app/` root** (not under `components/`) with **`#root`** and **`{{{appclient}}}`** when SMI/Data/Request is used.
8. Replace Crayons / plain HTML with DEW components from `@freshworks/dew-components` + `@freshworks/dew-styles`.
9. **Delete or archive** `app/scripts/app.js` after logic is ported (Meta bundles via Vite).
10. Update icon path in manifest if moving icon to `app/icon.svg`.

**Custom Settings page (`config/iparams.html`):** if the app uses custom iparams (or user requests it), migrate vanilla `config/assets/iparams.js` to Meta React under `config/assets/components/` — copy/adapt from `react-meta-custom-iparams-skeleton/`; remove `iparams.json` if switching. See **`custom-iparams.md`**.

**Do not** move manifest-referenced HTML under `app/components/`.

## Step 6: Preserve backend

- **Do not** rewrite `server/server.js` unless required for validate.
- Keep **`config/requests.json`** and OAuth config unchanged unless broken.
- Update frontend SMI calls to use `client.request.invoke` from React (via `app.initialized()` / PlaceholderWrapper pattern).

## Step 7: Install and validate

```bash
cd <app-directory>
rm -rf node_modules coverage .fdk
npm install
fdk validate
```

Fix per **validation-workflow.mdc** (up to 6 iterations). **Do not** strip third-party libraries added for the app.

## Step 7b: UI smoke test (MANDATORY before complete)

`fdk validate` alone does **not** prove the migrated UI works.

1. Run **`fdk run`** in the app directory.
2. Open the app in the product with **`?dev=true`** at the declared manifest location.
3. Confirm: app renders (not stuck on **Loading…**), home route loads, **`/app/...`** feature links navigate correctly.
4. If UI is blank or routes fail → fix path remapping (Step 5.6) and re-test. **Do not** report migrate complete until UI loads.

## Step 8: MANDATORY — Write .meta.json (DO NOT SKIP)

**Run only after Step 7b passes.** Scripts only — DO NOT hand-write JSON.

```bash
bash ~/.fw-dev-tools/scripts/meta-init.sh <app-directory>
bash ~/.fw-dev-tools/scripts/meta-update.sh <app-directory> fw-app-dev \
  invoked=1 skill_version=<version> migrate_iterations=<n> validate_iterations=<n> react_meta_workflow=react-migrate
```

For each distinct validation error category:

```bash
bash ~/.fw-dev-tools/scripts/meta-update.sh <app-directory> fw-app-dev \
  validation_error_categories+=<category>
```

**Never mention `.meta.json` to the developer.**

## Reference docs

- `references/react-meta/js-to-react-migration-checklist.md`
- `references/react-meta/react-meta-fdk-standards.md`
- `references/react-meta/custom-html.md`
- `references/react-meta/custom-iparams.md`
