# Custom iparams (React Meta)

Per [Meta framework](https://developers.freshworks.com/docs/app-sdk/v3.0/common/app-development-process/create-an-app-with-the-meta-framework/) and [custom installation page](https://developers.freshworks.com/docs/app-sdk/v3.0/common/app-settings/custom-app-settings/).

## When to use

| Approach | Use when |
|----------|----------|
| **`config/iparams.json`** (default skeleton) | Standard Settings fields |
| **`config/iparams.html` + React** | Custom Settings UI, validation, module-specific fields, DEW layout |

**Exactly one** of `iparams.json` or `iparams.html` — never both.

## Layout

```
config/
├── iparams.html
└── assets/
    ├── components/
    │   ├── main.jsx          # Entry → mountIparams()
    │   ├── mount.jsx         # ErrorBoundary + createRoot
    │   ├── ErrorFallback.jsx # Settings error UI
    │   └── IparamsForm.jsx   # DEW form + window methods
    └── styles/
        └── iparams.css       # DEW @import tokens
```

HTML shell: same rules as **`custom-html.md`** (`#root` at `config/` root, `{{{appclient}}}` when Request method / SMI / Jobs run on Settings). Sample: `assets/templates/react-meta-custom-iparams-skeleton/config/iparams.html`.

## Window methods (required)

Attach to **`window`** in `IparamsForm.jsx` (see skeleton):

- **`getConfigs`** — populate Edit Settings
- **`postConfigs`** — return field values on Install/Save
- **`validate`** — return `{}` or `{ field: 'error message' }`

Keep current values in a **ref** updated on each input change so `postConfigs` / `validate` read fresh data without re-registering handlers.

Secure fields: `postConfigs` return `{ __meta: { secure: ['api_key'] }, ... }`.

## UI

DEW only (`@freshworks/dew-components` + `@freshworks/dew-styles`). No Crayons. No `<DewTheme>` JSX — tokens via CSS `@import` in `iparams.css`.

## Adopt in an existing app

```bash
cp -r <skill-path>/assets/templates/react-meta-custom-iparams-skeleton/config/* <app-dir>/config/
rm <app-dir>/config/iparams.json   # if present
npm install react-error-boundary     # if not already in package.json from Meta skeleton
```

Test: `http://localhost:10001/custom_configs` during `fdk run`.

Patterns reference: [superstack](https://github.com/freshworks-developers/superstack) (structure only — use DEW in new apps).

## Related

- `custom-html.md` · `dew-components.md`
- `references/runtime/iparams-comparison.md` · `custom-iparams-docs.md` (vanilla API; adapt to React + DEW)
