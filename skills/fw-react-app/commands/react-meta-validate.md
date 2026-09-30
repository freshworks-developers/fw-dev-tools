---
name: react-meta-validate
description: Run fdk validate on a React Meta app with auto-fix discipline (platform + lint to zero).
globs: ["**/manifest.json"]
always: false
---

# React Meta validate

**Usage:** `/react-meta-validate`

1. Locate app root (folder with **`manifest.json`**). If multiple, ask which app.
2. Confirm **`metaConfig.framework`** is **`react`**; if missing, this may be the wrong workflow—surface **fw-react-app** SKILL.md or **fw-migrate-to-react-app**.
3. Apply **fw-app-dev** *Manifest + toolchain gate* before validation (**Node 24** + **FDK 10**, Platform **3.0**, **engines** aligned).
4. From app root run **`fdk validate`**. Capture output.
5. Fix **platform** and **lint** errors; re-run up to **6** iterations or until **0 / 0**, matching **fw-app-dev** rules (**complexity**, **async/await**, **unused params**, **requests** manifest sync, **icon** path, etc.).

Output a short verdict: pass/fail and remaining issues if any.
