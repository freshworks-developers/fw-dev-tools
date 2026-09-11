# Custom HTML (Meta framework)

Per [official Meta framework documentation](https://developers.freshworks.com/docs/app-sdk/v3.0/common/app-development-process/create-an-app-with-the-meta-framework/).

## Location

HTML entry files at **`app/` root** or **`config/` root**:

- `app/index.html`
- `app/ticketSidebar.html`
- `config/iparams.html`

Configure the filename in `manifest.json` → `location.url`.

## Do not nest

Manifest-referenced HTML must **not** live under `app/components/`, `app/scripts/`, etc.

## Minimal shell

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>App</title>
    <script async src="{{{appclient}}}"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

- **`#root`** — React mount point; FDK bundles JS/CSS via Vite
- **No Crayons CDN** in Meta apps

## `{{{appclient}}}`

Include when the app uses:

- Data method
- Request method
- Installation settings
- Data store
- SMI (hybrid/OAuth)

Omit for pure frontend apps with no client SDK needs.

## Multi-placeholder

One HTML shell per surface. [Superstack](https://github.com/freshworks-developers/superstack) uses `index.html`, `ticketSidebar.html`, `modal.html`, etc.

## Custom iparams (Settings page)

For a **React-based custom Settings page**, use **`config/iparams.html`** (not `config/iparams.json`):

- Same rules: **`#root`**, HTML at **`config/` root**, **`{{{appclient}}}`** when Request method / SMI / Jobs are used on Settings
- React entry: `config/assets/components/main.jsx` (bundled by FDK Vite)
- Expose **`window.getConfigs`**, **`window.postConfigs`**, **`window.validate`**

Full workflow and sample files: **`custom-iparams.md`** · template: `assets/templates/react-meta-custom-iparams-skeleton/`
