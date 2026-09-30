# React Meta — quick reference

## Location module map (common)

| Surface | Typical module key |
|--------|---------------------|
| `full_page_app` | `modules.common.location` |
| `cti_global_sidebar` | `modules.common.location` |
| `ticket_sidebar` (Freshdesk) | `modules.support_ticket.location` |
| `ticket_top_navigation`, `ticket_background` | `modules.support_ticket.location` |
| `contact_sidebar` | `modules.support_contact.location` |
| `company_background` | `modules.support_company.location` |
| `ticket_sidebar` (Freshservice) | `modules.service_ticket.location` |

Always confirm against current product docs if unsure.

## Custom iparams React contract

The platform calls these on **`window`** (assign inside your React tree):

1. **`window.getConfigs(configs)`** — populate form state from saved configs.
2. **`window.postConfigs()`** — return a plain object of values to persist on Save.
3. **`window.validate()`** — return boolean **`true`** to allow save, **`false`** to block; runs before `postConfigs`.

Bootstrap still waits on **`window.app.initialized()`** before mounting the form UI.

## Hook patterns (sketches)

- **`useFreshworksData(key)`** — wraps `window.client.data.get(key)` with loading/error state.
- **`useInvokeTemplate(name)`** — wraps `client.request.invokeTemplate` + JSON parse.
- **`useServerMethod(name)`** — wraps `client.request.invoke`.
- **`AppLifecycleProvider`** — subscribes to `app.activated` / `app.deactivated` for placeholder refreshes.

Implement in project code as needed; keep complexity ≤ 7 per function for server lint rules.

## Client APIs (after init)

Illustrative list: `request.invokeTemplate`, `request.invoke`, `data.get`, `db.*`, `iparams.get`, `interface.trigger`, `instance.*`, `events.on/off`.

Data keys depend on surface (e.g. `ticket`, `contact`, `loggedInUser`, `domainName`, …).

## Official docs (indices)

- [App SDK overview](https://developers.freshworks.com/docs/app-sdk/v3.0/)
- [Placeholders](https://developers.freshworks.com/docs/app-sdk/v3.0/freshdesk/front-end-apps/placeholders/)
- [Request templates](https://developers.freshworks.com/docs/app-sdk/v3.0/freshdesk/front-end-apps/requests/)
- [SMI](https://developers.freshworks.com/docs/app-sdk/v3.0/freshdesk/serverless-apps/server-method-invocation/)
- [Installation parameters](https://developers.freshworks.com/docs/app-sdk/v3.0/freshdesk/installation-parameters/)
