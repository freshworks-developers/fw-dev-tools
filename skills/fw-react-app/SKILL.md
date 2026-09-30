---
name: fw-react-app
version: "1.0.0"
description: Scaffolds and extends Freshworks Platform 3.0 marketplace apps that use the React Meta framework (manifest metaConfig.framework react, JSX entries, FDK bundler). Use when creating a new React-based FDK app, adding React Meta to a greenfield 3.0 app, adding placeholder surfaces with per-surface HTML + JSX entries, or when the user mentions react-starter-template, React Meta, or FDK React frontend.
compatibility: "Freshworks Platform 3.0; Node.js 24.x + FDK 10.x (see fw-setup). Defers manifest/requests/server/OAuth rules to fw-app-dev."
argument-hint: "[react-meta-scaffold|react-meta-add-surface|react-meta-validate]"
---

# Freshworks React Meta app creation

**Orchestration:** Treat **`fw-app-dev`** (or **`app-dev`**) as the source of truth for Platform 3.0 rules—manifest shape, `fdk validate` loops, request templates (`<%= %>`), OAuth, SMI, security, lint/complexity, and `app/styles/images/icon.svg`. This skill adds **React Meta–specific** structure and workflows on top of that baseline.

**Related upstream patterns:** [fw-dev-tools/skills](https://github.com/freshworks-developers/fw-dev-tools/tree/main/skills) (`fw-app-dev`, `fw-setup`).

## Prerequisites

- **Node.js 24.x** and **FDK 10.x** installed (`node --version`, `fdk version`). If the toolchain is wrong or missing, use **`fw-setup`** / install docs—do not pretend `fdk` exists.
- Target **Platform 3.0** only (`"platform-version": "3.0"`, `modules` not `product`).

## Canonical create path

1. Empty folder for the app; **do not** scatter app files in an unrelated repo root.
2. Run **`fdk create`** and select **`react-starter-template`** (official scaffold: `package.json`, `app/index.html`, `app/components/*.jsx`, `vitest.config.js`, etc.).
3. After generation: **`npm install`** if needed, then **`fdk validate`** and fix until **0 platform + 0 lint** errors (same discipline as `fw-app-dev`—up to 6 fix iterations).

**Local run:** `fdk run` → append `?dev=true` to the product URL (use `&dev=true` if the URL already has query parameters). First-time browser prompt: allow local network access.

**Local helper URLs** (while `fdk run` is active): `http://localhost:10001/system_settings`, `http://localhost:10001/custom_configs`, `http://localhost:10001/web/test`.

## React Meta identification

In **`manifest.json`**, require:

```json
"metaConfig": {
  "framework": "react"
}
```

- **`package.json`** is the npm project manifest; list **`react`** and **`react-dom`** as dependencies (versions per template/current FDK expectations—not platform-provided).
- **`engines`:** For new apps, align with **`fw-app-dev`** defaults (**FDK 10.x**, **Node 24.x**) unless the user’s environment forces the documented last-resort path in that skill.

## HTML entry files (`app/*.html`)

Every surface (`full_page_app`, `ticket_sidebar`, modals, **`config/iparams.html`**, etc.) **must** include the App SDK script:

```html
<script src="{{{appclient}}}"></script>
```

- Use **triple braces** `{{{appclient}}}` (Handlebars placeholder). Omitting it leaves `window.app` undefined and breaks all platform APIs.
- Typical shell: `<div id="root"></div>` plus a **module** entry, e.g.  
  `<script type="module" src="./components/MyEntry.jsx"></script>`  
  (exact path matches the surface).

## Bootstrapping React

- **Do not** mount the real UI until **`window.app.initialized()`** resolves (iframe channel setup).
- Pattern: call `window.app.initialized().then((client) => { window.client = client; ... })`, then render (often via `createRoot` on `#root`).
- For sidebars and other placeholders, prefer a **small entry file** per surface and optionally a shared wrapper (e.g. lifecycle via `client.events.on('app.activated' | 'app.deactivated')`). Do **not** load the full-page bundle inside a sidebar entry.

## Surfaces and manifest locations

- Each placeholder/surface = **its own HTML file** under `app/` + **its own JSX entry**—lightweight and purpose-specific.
- **`full_page_app`** (and other **common** locations) live under **`modules.common.location`**.
- Product-specific placeholders (e.g. Freshdesk **`ticket_sidebar`**) live under the correct product module (e.g. **`modules.support_ticket.location`**). See placement tables in official docs and in [references/react-meta-quick-reference.md](references/react-meta-quick-reference.md).

**Routing:** Use client-side routing (e.g. React Router) **only** in **`full_page_app`**. Other surfaces should be single-purpose (no multi-page router).

## Backend and config (unchanged vs vanilla 3.0)

- **`config/requests.json`**, **`server/server.js`**, events, SMI, **`client.request.invokeTemplate`**, **`client.request.invoke`**, and **`renderData`** behave the same as non-React apps.
- Every **`requests.json`** key must appear under **`modules.common.requests`** in `manifest.json`.
- Secrets stay in **iparams**, request templates, or server code—never in frontend source.

## Installation parameters

- Simple forms: **`config/iparams.json`**.
- **Custom React iparams UI:** `config/iparams.html` (with `{{{appclient}}}`) + React under e.g. **`config/assets/components/`**, implementing **`window.getConfigs`**, **`window.postConfigs`**, and **`window.validate`** as required by the platform (see [references/react-meta-quick-reference.md](references/react-meta-quick-reference.md)).

## Testing and quality bar

- Run **`fdk validate`** before claiming the app is ready; fix platform and **lint** issues.
- Use **`tests/`** + **`vitest.config.js`** from the template as the starting point for unit tests.
- Optional hooks patterns (`useFreshworksData`, `useInvokeTemplate`, `useServerMethod`, lifecycle context): see [references/react-meta-quick-reference.md](references/react-meta-quick-reference.md).

## Do not

- Generate **Platform 2.x** manifests or **`$request.post|get`|** patterns.
- Use **`{{variable}}`** in request templates—use **`<%= iparam.* %>`, `<%= context.* %>`, `<%= access_token %>`** only.
- Ship frontend apps without a manifest **`icon`** path that resolves to an existing file (commonly **`app/styles/images/icon.svg`** per `fw-app-dev`—keep manifest paths and disk layout in sync).

## Progressive disclosure

- **Rules:** [rules/react-meta-bootstrap.mdc](rules/react-meta-bootstrap.mdc), [rules/react-meta-orchestration.mdc](rules/react-meta-orchestration.mdc)
- **Commands:** [commands/](commands/)
- **Quick reference:** [references/react-meta-quick-reference.md](references/react-meta-quick-reference.md)
- Full React Meta narrative (bootstrap, templates, SMI, troubleshooting): **React Meta gist** PDF / internal docs
