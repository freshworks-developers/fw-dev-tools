# Integration playbooks (golden paths)

End-to-end **Platform 3.0** recipes: manifest + `config/requests.json` + `server/server.js` + validation notes. Load **one** playbook for the integration you are building, then deep-link into architecture docs only when you need extra detail.

| Playbook | Stack |
|----------|--------|
| [slack-incoming-webhook-hybrid.md](slack-incoming-webhook-hybrid.md) | Secure iparam webhook path + `invokeTemplate` + hybrid UI + optional `onTicketCreate` |
| [microsoft-graph-account-oauth.md](microsoft-graph-account-oauth.md) | Account OAuth + `access_token` + Graph `GET` + hybrid UI |

**Out of scope here:** Google Sheets append and other Google-specific operational steps — use **web search** on official Google documentation for scopes, ranges, and URLs, then implement with account OAuth + `access_token` per `references/architecture/oauth-configuration-latest.md`.

**Also read:** `references/events/onTicketUpdate-payload-contract.md` for ticket event payloads; `rules/async-patterns.mdc` for `renderData` on async server methods.

**MCP server integrations** (`actions.json`, SMI, flat request schemas): use sibling skill **[fw-build-your-mcp-server](../../../fw-build-your-mcp-server/)** — routing **[AGENTS.md](../../../../AGENTS.md)** (**fw-build-your-mcp-server**).
