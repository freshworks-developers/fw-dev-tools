# React Meta FDK standards

## manifest.json

```json
{
  "platform-version": "3.0",
  "modules": { ... },
  "metaConfig": {
    "framework": "react",
    "packageManager": "npm"
  },
  "engines": {
    "node": "24.11.0",
    "fdk": "10.1.0"
  }
}
```

- `metaConfig` lives in **manifest.json only**
- Minimum **FDK 10.1.0** for Meta apps

## Directory layout

```
my-meta-app/
├── vite.config.js              # Optional (FDK 10.1.5+)
├── package.json
├── manifest.json
├── app/
│   ├── index.html
│   ├── index.jsx
│   ├── icon.svg
│   ├── components/
│   ├── public/
│   └── styles/
├── config/
└── test/
```

## UI (DEW 3.0 — required)

All React Meta UI **must** use:

- **`@freshworks/dew-components`** — components
- **`@freshworks/dew-styles`** — token stylesheets

See `dew-components.md` and [Storybook](https://dew.freshworkscorp.com/dew-3.0/).

## React Router

```jsx
<Routes>
  <Route path="*" element={<Home />} />
  <Route path="/app/tailwind" element={<TailwindPage />} />
</Routes>
```

- Fallback home: `path="*"`
- Features: `/app/...` prefix

## iparams (React)

Default: **`config/iparams.json`**. Custom Settings UI: **`custom-iparams.md`** + `assets/templates/react-meta-custom-iparams-skeleton/`.

## TypeScript

Supported: rename `.jsx` → `.tsx`, add `tsconfig.json`. React **19+** preferred.

## Platform 3.0 (unchanged)

- `modules` not `product`
- `$request.invokeTemplate` + `config/requests.json`
- OAuth `integrations` wrapper
