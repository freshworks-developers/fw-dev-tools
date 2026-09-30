---
name: react-meta-scaffold
description: Scaffold a new Freshworks React Meta app with fdk create and react-starter-template. Use when starting a greenfield React UI app or reproducing the official template layout.
globs: ["**/manifest.json"]
always: false
---

# React Meta scaffold

**Usage:** `/react-meta-scaffold`

Follow **SKILL.md** in this skill end-to-end. Summary:

1. Confirm **Node 24.x** + **FDK 10.x** (otherwise **fw-setup** first).
2. Create an **empty** app directory; run **`fdk create`** → **`react-starter-template`**.
3. Run **`npm install`** if needed.
4. Ensure **`manifest.json`** includes **`metaConfig.framework`: `"react"`** (template usually does).
5. Run **`fdk validate`**; fix until **0 platform + 0 lint** per **fw-app-dev** (up to 6 iterations).

Report the app path, validation result, and next steps: **`fdk run`**, product URL with **`?dev=true`**, and **`http://localhost:10001/system_settings`**.
