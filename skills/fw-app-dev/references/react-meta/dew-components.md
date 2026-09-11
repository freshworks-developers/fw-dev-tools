# DEW components (React Meta — required UI)

React Meta apps **must** use UI from **`@freshworks/dew-components`** and design tokens from **`@freshworks/dew-styles`** (DEW 3.0). Do not use Crayons, plain HTML controls, or ad-hoc UI libraries as the primary component set.

| Package | Purpose |
|---------|---------|
| `@freshworks/dew-components` | DEW 3.0 React components |
| `@freshworks/dew-styles` | Colors, typography, spacing tokens |

**Component catalog:** [dew.freshworkscorp.com/dew-3.0/](https://dew.freshworkscorp.com/dew-3.0/) (Storybook)

## Installation

```bash
npm install @freshworks/dew-components @freshworks/dew-styles
```

## Required imports

**Components** — import only from `@freshworks/dew-components`:

```jsx
import { TextButton, InputField, Badge } from '@freshworks/dew-components';
```

**Styles** — load DEW token CSS **before** React mounts. Preferred pattern (skeleton `app/styles/app.css`):

```css
@import '@freshworks/dew-styles/dist/colors.css';
@import '@freshworks/dew-styles/dist/fonts.css';
@import '@freshworks/dew-styles/dist/numbers.css';
```

Then in `app/index.jsx`:

```jsx
import './styles/app.css';
import { mountApp } from './mount';
mountApp();
```

### How DEW styles apply (no `<DewTheme>` wrapper)

| Layer | What applies styling |
|-------|----------------------|
| **`@freshworks/dew-styles`** | CSS token files (`colors.css`, `fonts.css`, `numbers.css`) set design variables on `:root` |
| **`@freshworks/dew-components`** | React components consume those tokens internally |
| **`DewTheme` export** | Tailwind **theme config object** only — use in `tailwind.config.js` → `theme.extend` when adding Tailwind; **not** a JSX wrapper |

Render `<App />` via `mountApp()` after `import './styles/app.css'`. DEW components (e.g. `TextButton`) pick up tokens automatically once the CSS is loaded.

**Do not** wrap the root in `<DewTheme>` — in `@freshworks/dew-components` v1.x it is **not** a React component. `<DewTheme><App /></DewTheme>` crashes React (`Element type is invalid… got: object`) and leaves a blank UI.

Optional: use `app/mount.jsx` with `react-error-boundary` so runtime errors show a message instead of a white screen.

Browse available exports and usage in Storybook before adding custom UI.

## Registry (GitHub Packages)

If `npm install` fails on the public registry, configure GitHub Packages:

```
@freshworks:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

## Forbidden in Meta workflow

- `@freshworks/crayons`, Crayons CDN, `<fw-*>` web components
- Plain `<button>`, `<input>`, `<select>` as primary UI (use DEW components)
- Third-party UI libs **replacing** DEW as the base (Tailwind/MUI may supplement — see `styling-and-third-party.md`)
