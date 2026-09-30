---
name: react-meta-add-surface
description: Add a new app surface (placeholder) with its own app/*.html shell and dedicated JSX entry for Freshworks React Meta.
globs: ["**/manifest.json", "**/app/*.html"]
always: false
---

# React Meta — add surface

**Usage:** `/react-meta-add-surface`

1. Read **`manifest.json`**: confirm **`platform-version`** `3.0` and **`metaConfig.framework`** `"react"`.
2. Choose **placement** (e.g. `ticket_sidebar`) and the correct **module** (see **`references/react-meta-quick-reference.md`** or **fw-app-dev** `rules/platform3-modules-locations.mdc`).
3. Add **`location`** entry with **`url`** (e.g. `ticketSidebar.html`) and **`icon`** path that **exists** on disk (often `styles/images/icon.svg`).
4. Create **`app/<url>`** HTML:
   - `<script src="{{{appclient}}}"></script>` in `<head>` or early `<body>`.
   - Mount node (e.g. `<div id="root"></div>`).
   - `<script type="module" src="./components/...jsx"></script>` for a **dedicated** entry (not the full-page bundle).
5. Add **JSX entry** component: wait for **`window.app.initialized()`**, set **`window.client`**, then render.
6. Run **`fdk validate`** and fix issues.

If the user is unsure which module/placement: ask product (Freshdesk vs Freshservice) and surface name.
