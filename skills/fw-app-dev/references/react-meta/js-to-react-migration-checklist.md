# JS → React Meta migration checklist

Use with **`/fdk-react-migrate`**.

## Before you start

- [ ] `platform-version` is `"3.0"` (else **`/fdk-migrate`** first)
- [ ] Node **24.x** + FDK **10.1.0+**
- [ ] Inventory all manifest locations and HTML file names

## Manifest

- [ ] Add `metaConfig.framework: "react"`
- [ ] Raise `engines.fdk` to **10.1.0** minimum
- [ ] Keep all `modules`, requests, functions, events declarations

## Frontend

- [ ] Keep HTML at `app/` or `config/` root
- [ ] Load DEW styles via `app/styles/app.css` `@import` — **no `<DewTheme>` JSX wrapper**
- [ ] Replace Crayons CDN with React entry (`app/index.jsx` + `app/mount.jsx` + `react-error-boundary`)
- [ ] Port `app/scripts/app.js` logic to `app/components/*.jsx`
- [ ] Add React Router: specific `/app/...` routes **before** `path="*"` catch-all
- [ ] **Remap navigation:** every old link/view path → `/app/...`; update all `Link` / `navigate()` / `href` targets
- [ ] **Multi-location:** each manifest `location.url` HTML at `app/` root with `#root` (+ `{{{appclient}}}` if SMI/Data/Request)
- [ ] Replace `<fw-*>` / plain HTML with DEW components
- [ ] Preserve `{{{appclient}}}` where SMI/Data/Request used
- [ ] Update icon path if moving to `app/icon.svg`

## package.json

- [ ] Add React 19+, `@freshworks/dew-components`, `@freshworks/dew-styles`, `react-error-boundary`, `react-router-dom`
- [ ] Remove `@freshworks/crayons` if present
- [ ] Keep legitimate third-party deps

## Backend (preserve)

- [ ] Do not rewrite `server/server.js` unless required
- [ ] Keep `config/requests.json`, `oauth_config.json`
- [ ] Update frontend SMI calls to React + `client.request.invoke`

## Config / iparams

- [ ] Keep `config/iparams.json` unless user needs custom Settings UI
- [ ] Custom Settings: `config/iparams.html` + `config/assets/components/` — see **`custom-iparams.md`**; remove `iparams.json`
- [ ] Migrate vanilla `config/assets/iparams.js` → React `IparamsForm.jsx` + `window.getConfigs/postConfigs/validate`

## Validate

- [ ] `npm install`
- [ ] `fdk validate` → 0 platform, 0 lint errors
- [ ] **`fdk run` + product smoke test** — UI loads, routes navigate (not blank / not stuck on Loading…)
- [ ] Write `.meta.json` via meta scripts
