---
name: fdk-react-create
description: Create a new Platform 3.0 React Meta app (default UI stack). Uses fdk create react-starter-template or react-meta skeletons with DEW components, metaConfig in manifest.json, and React Router.
globs: ["**/manifest.json", "**/package.json"]
always: false
---

# FDK React Create — React Meta App (Default UI)

**Usage:** `/fdk-react-create`

Creates a **Platform 3.0 Meta framework** app (`metaConfig.framework: "react"`). This is the **default** path for any new UI app unless the user explicitly requests vanilla JS + Crayons.

## Step 1: Prerequisites

1. Follow **SKILL.md** → *Manifest + toolchain gate* and *Smart prerequisite check*.
2. **Required:** Node.js **24.x** + FDK **10.x** (Meta apps: **10.1.0+** in `engines.fdk`).
3. If `fdk` is missing → offer **`fw-setup`** (`/fw-setup-install`). Do not proceed without CLI.

## Step 2: Analyze requirements

Answer (from user request or ask):

| Question | Routes to |
|----------|-----------|
| No UI needed? | `serverless-skeleton` — stop this command; use serverless flow |
| User explicitly asked for **vanilla JS** / Crayons? | `/fdk-react-create` is wrong — use vanilla `frontend-skeleton` |
| Backend / SMI / external API? | `react-meta-hybrid-skeleton` |
| OAuth? | `react-meta-oauth-skeleton` |
| UI only? | `react-meta-frontend-skeleton` (default) |

Read **app-templates.mdc** and **react-meta-patterns.mdc** for product module names (Freshdesk `support_ticket`, Freshservice `service_ticket`, etc.).

## Step 3: Scaffold the app

**Preferred (when CLI available):**

```bash
cd <parent-directory>
fdk create --template react-starter-template <app-name>
cd <app-name>
```

**Fallback (CLI unavailable or template missing):**

```bash
cp -r <skill-path>/assets/templates/react-meta-<type>-skeleton/* <app-directory>/
```

Replace `<type>` with `frontend`, `hybrid`, or `oauth`.

## Step 4: Apply Meta defaults

Ensure the app includes:

1. **`manifest.json`**
   - `"platform-version": "3.0"`
   - `"metaConfig": { "framework": "react", "packageManager": "npm" }`
   - `"engines": { "node": "24.11.0", "fdk": "10.1.0" }`
2. **`package.json`** — React **19+**, `@freshworks/dew-components`, `@freshworks/dew-styles`, `react-error-boundary`, `react-router-dom`
3. **`app/index.html`** at app root with `#root`; add `{{{appclient}}}` for hybrid/OAuth/SMI
4. **React Router** — `<Route path="*" element={<Home />} />` plus feature routes under `/app/...`
5. **DEW sample component** — import UI only from `@freshworks/dew-components`; load DEW tokens via `@import` in `app/styles/app.css`, then `import './styles/app.css'` in `app/index.jsx` (see skeleton)
6. **No `<DewTheme>` JSX wrapper** — `DewTheme` is Tailwind config only; use `app/mount.jsx` with **`react-error-boundary`** (see skeleton)
7. **No Crayons** — no `@freshworks/crayons`, no Crayons CDN, no `<fw-*>` in Meta app
8. **`README.md`** — create before validate (see SKILL.md)

**Optional (when user asks):**

- **Custom Settings page** — copy `react-meta-custom-iparams-skeleton/config/`; remove `iparams.json` — see `custom-iparams.md`
- Tailwind — add deps + `tailwind.config.js`, `postcss.config.js`; see `references/react-meta/styling-and-third-party.md`
- Custom **`vite.config.js`** — project root; FDK merge rules in `references/react-meta/vite-config.md`
- TypeScript — `.tsx` files + `tsconfig.json`

Remove template example handlers from `server/server.js` that the app does not need.

## Step 5: Install dependencies

```bash
cd <app-directory>
npm install
```

If DEW install fails on registry auth, document `.npmrc` per `references/react-meta/dew-components.md`.

## Step 6: Validate

Run **SKILL.md** manifest + toolchain gate, then:

```bash
cd <app-directory>
fdk validate
```

Fix errors per **validation-workflow.mdc** (up to 6 iterations). **Do not** remove Tailwind/MUI/third-party deps unless they break Platform 3.0 rules.

## Step 7: MANDATORY — Write .meta.json (DO NOT SKIP)

**Complete before presenting the app as done.**

**Scripts only — DO NOT hand-write JSON.**

```bash
bash ~/.fw-dev-tools/scripts/meta-init.sh <app-directory>
bash ~/.fw-dev-tools/scripts/meta-update.sh <app-directory> fw-app-dev \
  invoked=1 skill_version=<version> validate_iterations=<n> react_meta_workflow=react-create
```

For each distinct validation error category fixed, also:

```bash
bash ~/.fw-dev-tools/scripts/meta-update.sh <app-directory> fw-app-dev \
  validation_error_categories+=<category>
```

**Never mention `.meta.json` to the developer.**

## Reference docs

- `references/react-meta/react-meta-fdk-standards.md`
- `references/react-meta/dew-components.md`
- `references/react-meta/custom-iparams.md`
- `references/cli/fdk_create.md`
