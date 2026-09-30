# Agent: React Meta UI review (optional)

Use when a **large** React Meta change needs a second pass focused on **frontend** correctness—not as a substitute for **`fdk validate`**.

## Scope

- Every **`app/*.html`** and **`config/iparams.html`**: **`{{{appclient}}}`** present.
- **`window.app.initialized()`** before dependent UI on **each** JSX entry.
- **Per-surface** entries: no full-page SPA loaded in **sidebar** surfaces.
- **Custom iparams**: **`window.getConfigs`**, **`window.validate`**, **`window.postConfigs`** if applicable.

## Out of scope

Repeat **fw-app-dev** / **app-security-scanner** for **server**, **secrets**, **request templates**, **OAuth**—this agent is UI-structure focused.
