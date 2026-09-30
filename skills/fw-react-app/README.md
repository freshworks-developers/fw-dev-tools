# fw-react-app

Freshworks **Platform 3.0** skill for **React Meta** apps: `metaConfig.framework` `"react"`, JSX entries, FDK bundler, and per-surface HTML shells.

## Layout (matches [fw-app-dev](https://github.com/freshworks-developers/fw-dev-tools/tree/main/skills/fw-app-dev))

| Path | Role |
|------|------|
| `SKILL.md` | Main instructions |
| `README.md` | This file |
| `.cursor-plugin/plugin.json` | Cursor plugin manifest + slash commands |
| `.claude-plugin/plugin.json` | Claude Code plugin manifest + slash commands |
| `commands/` | Slash command docs (`/react-meta-*`) |
| `rules/` | Cursor rules (bootstrap, orchestration) |
| `references/` | Quick reference tables, doc links |
| `agents/` | Optional focused review prompts |
| `assets/templates/` | Notes; official scaffold = `fdk create` → `react-starter-template` |

## Slash commands (Cursor / Claude plugin)

- **`/react-meta-scaffold`** — new app via **react-starter-template**
- **`/react-meta-add-surface`** — add placeholder + HTML + JSX entry
- **`/react-meta-validate`** — **`fdk validate`** with zero-error discipline

## Dependencies

- **Toolchain:** **fw-setup** (Node 24 + FDK 10).
- **Platform semantics + validate depth:** **fw-app-dev** (or **app-dev** skill).

## Install (illustrative)

If this skill is published under **fw-dev-tools**:

```bash
npx skills add https://github.com/freshworks-developers/fw-dev-tools --skill fw-react-app
```

For local development, point your skills path at this folder.
