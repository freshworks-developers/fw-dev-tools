# Freshworks Platform Ecosystem Map (v1)

**Version:** 1.0.0 · **Package:** fw-dev-tools · **Updated:** 2026-08-13

Authoritative static map for platform Q&A when MCP is unavailable. Cite this file when used.

---

## Products

| Product | Module key | Primary placements |
|---------|------------|--------------------|
| Freshdesk | `support_ticket` | Ticket sidebar, ticket background, contact sidebar |
| Freshservice | `service_ticket` | Incident sidebar, change sidebar, asset sidebar |
| Freshsales | `lead` | Lead/deal sidebar, contact sidebar |
| Freshcaller | `call` | Call sidebar |

---

## Modules & events (Freshdesk)

| Module | Example events | Typical use |
|--------|----------------|-------------|
| Ticket | `ticket.create`, `ticket.update`, `ticket.status_changed` | Sidebar apps, automations |
| Contact | `contact.create`, `contact.update` | Customer context apps |
| Company | `company.create`, `company.update` | Account-level apps |
| Canned response | `canned_response.create` | Agent productivity |

*Full event catalog: prefer `get_developer_docs` MCP or [Freshworks developer docs](https://developers.freshworks.com/).*

---

## UI placements (Platform 3.0)

| Placement | Location | Framework notes |
|-----------|----------|-----------------|
| `ticket_sidebar` | Right panel on ticket view | React Meta (DEW) default; Crayons opt-in |
| `ticket_background` | Background on ticket pages | Serverless or frontend |
| `contact_sidebar` | Contact detail view | Same as ticket sidebar |
| `full_page_app` | Dedicated app page | React Meta recommended |

---

## API patterns

- **OAuth apps** — secure iparams; never store tokens in `.fw-session.json`.
- **Platform 3.0** — Node **v24**, FDK **v10**, React Meta or serverless per product.
- **External HTTP** — only via `$request.invokeTemplate` + `config/requests.json`.
- **Build your own MCP server (MCP app)** — separate from standard marketplace apps; use **fw-build-your-mcp-app**. Implemented with `actions.json` and SMI handlers.

---

## Common limits (indicative — verify in docs)

| Limit | Typical value | Notes |
|-------|---------------|-------|
| API rate (sandbox) | Varies by product | Check product API docs |
| Custom app install | Per-account | Marketplace submission separate |
| iparam count | Per manifest | Validate with `fdk validate` |
| Request timeout (serverless) | 20s default | Platform 3.0 serverless apps |

---

## Lookup order (controller step 3)

1. Search this map (`~/.fw-dev-tools/specs/ecosystem-map.md` or `skills/shared/references/ecosystem-map.md`).
2. If insufficient, call MCP **`get_developer_docs`** (hosted fw-dev-mcp).
3. If still unknown, state limitation — never fabricate modules, events, or limits.

---

## When to escalate to live docs

- Exact rate limits, SLA, or pricing
- New product features after this map's date
- Account-specific marketplace publish status → `#publish-status` intent + MCP
