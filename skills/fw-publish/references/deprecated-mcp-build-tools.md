# Deprecated MCP build tools (fw-dev-mcp)

**Server:** `https://mcp.freshworks.dev/mcp`

Four legacy MCP tools attempted app building outside skill orchestration. They are **deprecated** on the server — handlers return a **deprecation contract** instead of executing build logic.

---

## Deprecated tools

| Tool | Former role |
|------|-------------|
| `implement_app` | Generate or scaffold app code from a prompt |
| `get_implementation_plan` | Produce a build plan before implementation |
| `idea_to_app` | Turn a product idea into an app |
| `fix_app_errors` | Auto-fix validation or runtime errors |

**Do not retry** these tools. Follow the contract redirect.

---

## Deprecation contract (server response)

When any deprecated tool is invoked, the server returns a structured response (not build output):

```json
{
  "deprecated": true,
  "tool": "implement_app",
  "message": "This MCP tool is deprecated. App building must go through fw-dev-tools skills.",
  "redirect": {
    "skill": "fw-app-dev",
    "skillPath": "skills/fw-app-dev/SKILL.md",
    "alternatives": {
      "aiActions": "skills/fw-build-your-mcp-app/SKILL.md",
      "review": "skills/fw-review/SKILL.md",
      "publish": "skills/fw-publish/SKILL.md"
    },
    "reason": "Skills provide prerequisite checks, validation workflows, and marketplace review gates that MCP build tools bypassed."
  },
  "sunset": null
}
```

| Field | Description |
|-------|-------------|
| `deprecated` | Always `true` |
| `tool` | Name of the tool that was invoked |
| `message` | Human-readable deprecation notice |
| `redirect.skill` | Primary skill to open (`fw-app-dev` for Platform 3.0 app work) |
| `redirect.skillPath` | Relative path to the skill entry file |
| `redirect.alternatives` | Related skills for an MCP app, review, or publish |
| `redirect.reason` | Why the redirect is required |
| `sunset` | Optional ISO date after which the tool may be removed entirely; `null` during the buffer period |

---

## Agent behavior

1. **Stop** — do not retry the deprecated tool or work around the contract.
2. **Open** the skill named in `redirect.skill` (usually **fw-app-dev**; use **fw-build-your-mcp-app** for MCP-app work).
3. **Follow** the skill end-to-end order: fw-setup → fw-app-dev / fw-build-your-mcp-app → **fw-review (mandatory)** → fw-publish.
4. **Use MCP only for:**
   - Publish workflow tools — see **`openai-server-mcp-tools.md`**
   - **`get_developer_docs`** — **PRIMARY** for platform documentation questions; fall back to skill `references/` if MCP is unavailable (doc lookup only — not app-building routing)

---

## Supported MCP surface

Publish and docs tools remain active. See **`openai-server-mcp-tools.md`**.
