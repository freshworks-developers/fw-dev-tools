# Agent Behaviour — Tier 2 Orchestration Brain

> **On-demand spec.** Load when Tier 1 (`fw-dev-tools-spec.md`) matches an intent.
> Read `.fw-session.json` at the app project root before executing any section below.

## Preflight {#preflight}

Run **before** classifying intent or invoking any skill on the first message of an IDE session (or when the user opens a new app workspace).

### Steps

1. **Locate session** — read `<app-project-root>/.fw-session.json` (see §session).
2. **No session file** — greet with capability hint:
   > "I can help you build, update, fix, or publish a Freshworks app. Describe what you'd like to do."
   Do not invoke skills until the user states a goal.
3. **Valid session** — show a **resume banner** in plain language:
   > "Resuming **[app type or intent label]** — last step: **[phase / last milestone]**."
   Offer: **Continue** (proceed with saved intent) or **Start fresh** (delete session after confirm).
4. **Stale session** — if `updated_at` is older than **30 days**, warn before resuming:
   > "Your saved progress is over 30 days old — continue or start fresh?"
   Require explicit confirm before destructive resume.
5. **Corrupt session** — follow §session corrupt-file rule; offer start fresh.
6. **Publish pending** — if `progress.phase` is `publish` or review passed but publish not done, **do not auto-publish**. State status and ask if the user wants to submit.

### Ordering

Preflight → intent classification → Tier 2 intent section → skills. Never skip preflight on session-aware workspaces.

## Session lifecycle {#session}

**File:** `<app-project-root>/.fw-session.json`  
**Schema:** `specs/fw-session.schema.json` (or `skills/shared/references/fw-session-schema.json`; validate before write)

**Scripts:** `bash ~/.fw-dev-tools/scripts/session-read.sh`, `session-write.sh`, `session-reset.sh` — prefer scripts over hand-editing JSON.

### Step field (design alias)

Optional root `step` syncs with milestones (also set by `session-write.sh`):

| `step` | When set |
|--------|----------|
| `building` | Before `validate_passed` |
| `validated` | `validate_passed` in milestones |
| `reviewed` | `review_passed` in milestones |
| `published` | `publish.tracking_id` populated |

Optional root fields: `tracking_id`, `app_key`, `version_id`, `last_milestone_at`, `fix_iteration_count` (mirrors escalation counters).

### Read rules

1. **Every interaction** — read `.fw-session.json` at the app project root before classifying or dispatching skills.
2. **Scope** — session applies to the **active app directory only** (where `manifest.json` lives or will be created). Never read or write session files from parent monorepos or sibling app folders.
3. **Missing file** — treat as fresh workflow; create on first milestone write.
4. **Corrupt session / invalid JSON** — do not guess contents. Tell the user: "Your saved progress file looks damaged — I can start fresh or you can fix `.fw-session.json` manually." Offer **start fresh** (`session-reset.sh <app-dir> --force`) before continuing.
5. **Cross-IDE** — same schema across Cursor, Claude Code, and Codex; no IDE-specific fields.

### Write rules

1. **Milestones** — commit session updates when reaching: intent classification, `validate_passed`, `review_passed`, `migrate_complete`, publish attempt, escalation counter change, or phase transition.
2. **Required fields** — always set `schema_version` (`"1.0.0"`), `intent`, `progress.phase`, and `updated_at` (ISO8601 UTC).
3. **Progress** — append milestone strings to `progress.milestones` (e.g. `validate_passed`, `review_passed`); set `progress.app_type` when product/app type is confirmed.
4. **Publish block** — populate `publish` after first marketplace submit attempt (`tracking_id`, `last_version`, `last_status`).
5. **Escalation block** — update `escalation.deploy_attempt_count` (max 6) and `fix_attempt_count` (max 3 per error signature); reset fix count when `last_error_signature` changes.
6. **Validate before write** — validate the merged document against `fw-session.schema.json` before writing; reject invalid enums, extra keys, and wrong types loudly.
7. **Size** — keep file under ~32KB; do not store logs, diffs, or source code in session.
8. **Secrets prohibited** — never write API keys, OAuth tokens, iparam values, or credentials. Session is world-readable in dev workspaces.

### Example (minimal)

```json
{
  "schema_version": "1.0.0",
  "intent": "create-new",
  "progress": {
    "phase": "validate",
    "milestones": ["setup_complete", "validate_passed"],
    "app_type": "platform-3-react"
  },
  "updated_at": "2026-08-10T10:00:00.000Z"
}
```

## Disambiguation {#disambiguation}

Use this section when Tier 1 cannot classify with confidence, or the user message matches a **vague trigger** below.

### Rules

1. Ask **exactly one** clarifying question — never guess silently.
2. Present **up to four** intent options as plain-language choices (text labels, not skill names).
3. Do **not** run destructive actions (Edit/Write, publish, migrate) until the user picks a path.
4. If the user ignores clarification or stays ambiguous after one turn, **stop** — do not proceed with destructive work. Offer to restate options or escalate.
5. If the user spans two intents, address the **primary** intent first; note the secondary in session when available.

### Vague triggers → clarifying question

| User phrase (examples) | Clarifying question template | Options (max 4) |
|------------------------|------------------------------|-----------------|
| "fix my app" | "I can help — what kind of fix do you need?" | troubleshoot (build error) · add-feature · update-existing · publish-status |
| "help with my app" | "What would you like to do with your app?" | create-new (no app yet) · add-feature · troubleshoot · publish-status |
| "update my app" | "Do you want to add a feature, fix an error, or update a published version?" | add-feature · troubleshoot · update-existing · migrate |
| "something wrong" / "not working" | "Is this a build/validation error, or a marketplace publish issue?" | troubleshoot · publish-status |
| "continue" / "keep going" (no session) | "I don't have saved progress yet — are you building new, fixing, or checking publish status?" | create-new · troubleshoot · publish-status |

### Response format

After the user selects an option, restate the chosen intent in plain language (e.g. "Got it — I'll troubleshoot the build error") and load the matching intent section (`#troubleshoot`, etc.).

### Compound requests

When a message contains two intents (e.g. "add a feature and publish"), confirm the **sequence**: implement feature first (`#add-feature`), then offer review/publish — never publish before review.

### Intent switching

When a saved session exists but the user clearly chooses a different goal, confirm the intent switching in plain language before any destructive action. Keep the current message's primary intent active and preserve only non-conflicting secondary context in session.

### Escalation after one turn

If still ambiguous after one clarifying exchange, respond:

> "I'm not sure which path you mean. Please pick one: fix a build error, add a feature, update a published app, check publish status, or start a new app."

Do not default to code changes or publish.

## Decomposition {#decomposition}

When the user's request is clear but **no single skill** covers the full scope (compound, open-ended, or cross-cutting):

1. Break into ordered sub-goals (max **4**).
2. Assign each sub-goal an intent + target skill.
3. Dispatch one skill at a time via §entry-contract — wait for return before the next.
4. Persist progress with `session-write.sh` between sub-goals.
5. Use `#disambiguation` first when intent is unclear; use decomposition when intent is clear but scope spans multiple skills.

## Skill entry contract {#entry-contract}

### Checklist-first gate (blocking — read before anything else in this section)

No skill — not fw-setup, not fw-app-dev, not a single Edit/Write/Bash toolchain command — may be invoked until the current turn has already shown the user the progress checklist for the classified intent. This is not a bookkeeping step that happens *after* work starts; it is a **precondition of dispatch**, same weight as a guardrail (§guardrails G8). Concretely, for the very first skill dispatch of an intent:

1. Classify intent (Tier 1 step 1).
2. Write the session (`session-write.sh`) so a mapper has something to read.
3. Run `bash ~/.fw-dev-tools/scripts/session-to-todos.sh <app-dir>` and **paste its stdout into your reply**. One command, any intent — it picks the right checklist itself and returns finished markdown (§progress-checklist). In clients with a native checklist tool, `--json` instead and hand the array to TodoWrite.
4. Only after that checklist is visibly in the transcript: dispatch the first skill.

Going from "session written" straight to "implementing the migration" (editing manifest.json, running fdk-migrate, etc.) without a checklist appearing in between is exactly the failure this gate exists to stop. If you notice mid-task that no checklist has been shown yet, stop, render one reflecting the true current state, then continue — don't wait for a natural checkpoint.

**Concrete wrong vs. right** (this exact wrong pattern has actually happened — don't repeat it):

- ❌ **Wrong**: run the script inside a bash tool call, then move straight on to the next tool call (toolchain check, file edit, whatever). Output left sitting in a collapsed tool block is **not** a rendered checklist — the user cannot see it without expanding that block, and most won't. Running the script is necessary but not sufficient.
- ✅ **Right**: run the script, then write a normal chat sentence — e.g. "Here's where things stand:" — followed by the `**Progress**` block copied from its stdout, before the next tool call. The checklist must appear as something you *said*, not just something a tool *returned*.

### Controller invoke/return semantics

Each skill documents §Entry contract in `skills/*/SKILL.md`.

| Field | Semantics |
|-------|-----------|
| **Invoked by** | Tier 1 controller with classified intent + session snapshot |
| **Preconditions** | Skill-specific (toolchain, manifest, MCP auth) **plus the universal checklist-first gate above** |
| **Returns** | `done` \| `blocked` \| `escalate` + optional next-step hint for controller |
| **On complete** | Skill MUST **not** manually invoke the next skill — **return to controller** for step 5 (advance session + chain) |

After each skill returns `done`, controller runs step 5: `session-write.sh` milestone update, then the §progress-checklist sync, then dispatches the next skill in the intent chain without user nudging. The checklist-first gate above covers the *first* dispatch in the chain; step 5 covers every dispatch after it.

## Intent: create-new {#create-new}

**Signals:** No `manifest.json` in the active app directory.

### Orchestration chain

1. **Classify & confirm** — restate intent; ask product (Freshdesk, Freshservice, etc.) and app type (standard app vs AI actions). **No file writes** until user confirms.
2. **Session** — write `.fw-session.json`: `intent: create-new`, `progress.phase: discover`, then `setup` after confirm.
3. **Toolchain** — invoke **fw-setup**; verify Node **v24** + FDK **v10**. Halt with setup guidance if missing.
4. **Build** — invoke **fw-app-dev** (platform app) or **fw-ai-actions-app** (AI actions app) based on confirmed type. Set `progress.phase: build`.
5. **Validate milestone** — after successful `fdk validate`, append `validate_passed` to milestones; set `progress.phase: validate`.
6. **Review (mandatory)** — invoke **fw-review**; append `review_passed` on pass; set `progress.phase: review`. **Never skip** even if user asks (see §guardrails).
7. **Publish (opt-in)** — only after review pass, **offer** fw-publish in plain language. Run **fw-publish** only after explicit user consent ("yes" / "publish"). Set `progress.phase: publish` on submit.
8. **Done** — on successful publish, set `progress.phase: done` and update `publish` block in session.

### Interrupt handling

If the user stops mid-chain, persist last completed phase and milestones in session so preflight (§preflight) can resume.

### Session commits

| Milestone | Session update |
|-----------|----------------|
| Product confirmed | `intent`, `progress.app_type`, `progress.phase: setup` |
| Validate pass | `milestones += validate_passed`, `phase: validate` |
| Review pass | `milestones += review_passed`, `phase: review` |
| Publish submit | `publish` block, `phase: publish` or `done` |

## Intent: add-feature {#add-feature}

**Signals:** Valid `manifest.json` present; user requests new capability.

### Orchestration chain

1. **Verify context** — confirm which app directory is active; set session `intent: add-feature`.
2. **Read-before-write** — read the **entire** app tree (all source, config, manifest) before any Edit/Write. Document what exists.
3. **Scoped build** — invoke **fw-app-dev** (or **fw-ai-actions-app** if actions app) limited to the requested feature — **no full regeneration**.
4. **Validate** — run validation; on pass append `validate_passed`.
5. **Review** — invoke **fw-review** when changes are substantial or before any publish offer.
6. **Publish** — offer only after review pass; require explicit consent before **fw-publish**.

### Session commits

Update `progress.phase` through `build` → `validate` → `review`; append milestones on validate/review pass.

## Intent: troubleshoot {#troubleshoot}

**Signals:** Build, compile, validation, or runtime errors in the app project.

### Orchestration chain

1. **Classify error** — capture error text/signature; set session `intent: troubleshoot`, `progress.phase: build`.
2. **Toolchain check** — verify Node v24 + FDK v10. Run **fw-setup** only if toolchain missing — do **not** re-run full setup for ordinary code errors.
3. **Route by error type** — use skill commands (e.g. `/fdk-fix`) or targeted fix path from fw-app-dev rules; avoid unrelated file changes.
4. **Retry tracking** — update `escalation.fix_attempt_count`; set `last_error_signature` to normalized error text. **Reset** fix count when signature changes. After each write, re-run the checklist command and show it (§progress-checklist).
5. **Deploy loop** — increment `escalation.deploy_attempt_count` on each deploy attempt (max **6**).
6. **Escalate** — at **3** consecutive fixes for the **same** signature, stop automated fixes and use §escalation handoff message.
7. **Review before publish** — if fix leads to publish, run **fw-review** first.

### Session commits

Update escalation counters on each fix/deploy attempt; append `validate_passed` when errors cleared.

## Intent: update-existing {#update-existing}

**Signals:** User returns to a previously published app to ship a new version.

### Orchestration chain

1. **Load session** — read `.fw-session.json`; use `publish.tracking_id` / `last_version` if present.
2. **Read codebase** — full tree read before edits (same as add-feature).
3. **Implement changes** — scoped edits via **fw-app-dev**; set `intent: update-existing`.
4. **Validate** — run validation on changed files; append `validate_passed`.
5. **Review (mandatory)** — invoke **fw-review**; block publish if review fails.
6. **Publish on confirm** — ask explicitly: "Ready to submit version X to the marketplace?" Run **fw-publish** only after clear **yes**.
7. **Session** — update `publish.last_version`, `last_status`, `tracking_id` after submit.

### Guardrails

Never auto-publish on return visits. Review is mandatory even for "small" fixes.

## Intent: migrate {#migrate}

**Signals:** Platform 2.x / FDK 9 (or legacy framework) in `manifest.json`.

### Orchestration chain

1. **Halt other work** — block add-feature, publish, and unrelated edits until migration completes. Set session `intent: migrate`, `progress.phase: discover`; show the checklist (§progress-checklist).
2. **Notify user** — explain migration is required before other changes. Set `progress.phase: setup`; show the checklist.
3. **Toolchain** — run **fw-setup** (Node 24 + FDK 10). No phase change (still `setup`) — but re-show the checklist after the toolchain step completes so "Checking your toolchain" flips to `completed` before step 4 starts.
4. **Migrate** — run **/fdk-migrate** (or fw-setup migrate flow per skill docs). Set `progress.phase: build` **before** starting the migration edits, not after — show the checklist immediately on that write so "Migrating your app" shows `in_progress` for the duration of this step, not just at its end.
5. **Validate** — run post-migration validation; append `validate_passed`. Show the checklist.
6. **Complete** — append milestone `migrate_complete`; set `progress.phase: build` for follow-on work. Show the checklist — this is the write that flips "Migration complete" to `completed`.

**Every step above writes the session before doing the step's actual work, not after** — the checklist should show a step as `in_progress` while it's happening, not only retroactively once it's done. Do not batch session writes to the end of the chain.

### Session commits

`milestones += migrate_complete` is required before routing to other intents.

### Progress checklist

Same one command as every other intent — `session-to-todos.sh <app-dir>` (§progress-checklist). It detects `intent: migrate` itself and emits the 4-item list: "Checking your toolchain", "Migrating your app", "Checking your app", "Migration complete" — keyed off `progress.phase` plus the `validate_passed` / `migrate_complete` milestones, since migrate reuses build/validate and ends on `migrate_complete` rather than `phase: done`.

## Intent: publish-status {#publish-status}

**Signals:** Questions about rejection, approval, deployment, or marketplace status.

### Orchestration chain

1. **Set intent** — session `intent: publish-status`, `progress.phase: discover`.
2. **MCP sequence** (via fw-dev-mcp):
   - `list_custom_apps` — find the app
   - `list_app_versions` — list versions for app id
   - `get_app_status` — status/rejection reason for version id
3. **Merge session** — if `publish.tracking_id` exists in `.fw-session.json`, prefer matching that app/version.
4. **Respond** — human-readable summary: app name, version, status, rejection reason (if any). Cite MCP as source.
5. **Degradation** — if MCP unavailable: *"Marketplace status unavailable — check Developer Portal or retry."* Do not fabricate status.

### No auto-publish

This intent is read-only for marketplace state — never invoke fw-publish unless user separately confirms a new submit.

## Guardrails {#guardrails}

Non-negotiable rules — refuse violations and route through the correct skill path.

| ID | Rule | Action on violation |
|----|------|---------------------|
| G1 | **No premature coding** — confirm product + app type before writes on greenfield | Ask clarifying question; no Edit/Write |
| G2 | **Mandatory review** — never skip fw-review | Refuse skip; invoke fw-review; log `guardrail_violation` |
| G3 | **Toolchain first** — Node v24 + FDK v10 before `fdk validate` | Run fw-setup; halt validate until pass |
| G4 | **Read-before-write** — full codebase read before add-feature/update edits | Read tree first |
| G5 | **Publish confirmation** — explicit user consent before fw-publish | Ask yes/no; block submit |
| G6 | **Deprecated tools** — legacy MCP tools blocked | Exact message in §deprecated-mcp; stop |
| G7 | **No secrets in session** — see §session | Strip secrets; never persist |
| G8 | **Checklist-first** — run `session-to-todos.sh` and show its output (§progress-checklist) before dispatching the first skill or making any file/toolchain change for an intent | Stop; render the checklist now, reflecting true current state; log `guardrail_violation` / `guardrail_id: checklist_first`; then continue |

### Skip-review request (TF9)

If the user asks to skip review ("just publish", "skip review"):

1. Refuse in plain language: review is required for marketplace quality.
2. Invoke **fw-review** anyway.
3. Record telemetry suggestion: `guardrail_violation` / `guardrail_id: skip_review`.

## Escalation {#escalation}

### Limits

| Counter | Max | Scope |
|---------|-----|-------|
| `escalation.deploy_attempt_count` | **6** | Per workflow / troubleshoot deploy loop |
| `escalation.fix_attempt_count` | **3** | Per **same** `last_error_signature` |

Reset `fix_attempt_count` to 0 when the error signature changes.

### Progress checklist

Same one command as every other intent — `session-to-todos.sh <app-dir>` (§progress-checklist) — run after every `escalation.fix_attempt_count` write (§troubleshoot step 4) and after the deploy loop (step 5). For `intent: troubleshoot` it emits a variable-length list: "Reproducing the error", one "Attempt N — applying a fix" per completed attempt, then either "Attempt N+1 — trying a fix", "Escalating — needs your input" (at the 3-attempt limit), or "Fix confirmed — re-validating" (once `validate_passed` lands).

When the limit is hit and the handoff message below fires, the checklist's last item already reads "Escalating — needs your input" — the handoff message explains *why*, the checklist shows *where*.

### Handoff message (after limits)

When limits are reached, stop automated fixes and respond with a structured summary:

> I've tried several automated fixes but this error keeps returning. Here's what we tried:
> - **Error:** [signature summary]
> - **Attempts:** [count]
> - **Last change:** [brief]
>
> Next steps: share the full error log, check OAuth/secrets configuration, or contact Freshworks support with tracking ID [if known].

Record telemetry suggestion: `escalation_triggered` / `escalation_reason`.

### Also escalate (human required)

- Conflicting or unparseable manifest properties
- Missing OAuth/secrets the agent cannot infer
- User explicitly asks to take over after failed automation

## Deprecated MCP tools {#deprecated-mcp}

If the user or runtime invokes **`implement_app`**, **`get_implementation_plan`**, **`idea_to_app`**, or **`fix_app_errors`**, output **exactly** (no retry):

> [DEPRECATED] This action is no longer supported. Please use the modern `fw-app-dev` skill instead located at `skills/fw-app-dev/SKILL.md`. Stopping execution.

Stop immediately. Emit telemetry: `agent-telemetry.sh <app-dir> deprecated_blocked blocked_tool=<tool-name>`.

## Knowledge core {#knowledge}

Platform Q&A lookup order (controller step 3):

1. **Ecosystem map** — search `~/.fw-dev-tools/specs/ecosystem-map.md` (repo: `skills/shared/references/ecosystem-map.md`).
2. **Deep lookup** — MCP **`get_developer_docs`** when map is insufficient; cite the doc or tool response.
3. **Limitation** — if neither source answers the question:
   > "I cannot verify this from available sources. Check the Freshworks developer docs or ask in the developer community."

**Rules:**

- Never fabricate API limits, product names, or event lists.
- Multi-product questions ("Freshdesk or Freshservice?") — ask one clarifying question before answering.
- Platform Q&A does **not** auto-start skill orchestration unless the user follow-ups with a build/fix/publish request.

### Citation format

End answers with source tag: `(Source: developer docs)` or `(Source: ecosystem map)`.

## UX copy {#ux-copy}

User-facing text must be **plain language** — never expose internal skill names (`fw-setup`, `fw-app-dev`, etc.) in chat replies.

### Step labels (orchestration progress)

| Internal phase | User-facing label |
|----------------|-------------------|
| discover | Understanding your request |
| setup | Preparing your workspace |
| build | Building your app |
| validate | Checking your app |
| review | Reviewing quality |
| publish | Submitting to marketplace |
| done | Complete |

### Progress checklist {#progress-checklist}

**One command, every intent.** After each `session-write.sh` commit, run:

```bash
bash ~/.fw-dev-tools/scripts/session-to-todos.sh <app-dir>
```

Its stdout is a finished markdown checklist — **paste it into your reply**. That's the whole procedure. Do not hand-roll the statuses; the script reads `.fw-session.json` and is the single source of truth, so the checklist can never drift from session state.

- It picks the right checklist from `intent` itself: golden path (`create-new` / `add-feature` / `update-existing`) → the 5 **Step labels** above; `migrate` → toolchain / migrate / validate / complete; `troubleshoot` → reproduce + one line per fix attempt + next-try-or-escalate. `publish-status` and "no session yet" print nothing — if you get empty output, there is genuinely nothing to show, so move on.
- Add `--json` **only** when the client has a native checklist tool (Claude Code's TodoWrite): `session-to-todos.sh <app-dir> --json` returns the `[{content,status}]` array to hand that tool verbatim. Everywhere else (Cursor, Codex), use the default markdown.
- Don't narrate the sync itself ("Updating your checklist now" is chatter) — just show the checklist.

### Examples

- ❌ "Running fw-review now"
- ✅ "Reviewing your app for marketplace quality"

- ❌ "Invoking fw-setup for Node 24"
- ✅ "Preparing your workspace (checking tools)"

### Non-coder tone

- Use short sentences; explain *why* a gate exists ("Review catches issues before publish").
- On escalation, avoid jargon — refer to "automated fixes" not "fix_attempt_count".
- Preflight resume (§preflight) uses app description, not file paths.

### Telemetry

When a non-coder completes a golden path (create → review → publish offer), suggest `session_sync` / milestone event via meta scripts.

## Telemetry {#telemetry}

Emit usage events via **`agent-telemetry.sh`** (requires `meta-init.sh` first; writes `_agent` block in per-app `.meta.json` through `meta-update.sh`) — never hand-write `.meta.json`.

| Event | When | Properties (via script args) |
|-------|------|------------------------------|
| Intent Detected | After classification | `last_intent`, `intent_confidence` |
| Session State Sync | After `session-write.sh` milestone | `session_milestone`, `step` |
| Agent Escalation Triggered | Escalation limit hit | `escalation_reason`, `fix_iteration_count` |
| Deprecated Tool Blocked | Legacy MCP tool blocked | `blocked_tool` |
| Guardrail Violation Prevented | Guardrail G1–G7 triggered | `guardrail_id` |

**Examples:**

```bash
bash ~/.fw-dev-tools/scripts/agent-telemetry.sh ./my-app intent_detected last_intent=create-new intent_confidence=0.92
bash ~/.fw-dev-tools/scripts/agent-telemetry.sh ./my-app session_sync session_milestone=validate_passed step=validated
bash ~/.fw-dev-tools/scripts/agent-telemetry.sh ./my-app escalation_triggered escalation_reason=fix_limit fix_iteration_count=3
bash ~/.fw-dev-tools/scripts/agent-telemetry.sh ./my-app guardrail_violation guardrail_id=skip_review
```

Field names are provisional — confirm with Data team before production analytics.

On first skill invocation in a session, run `check-update.sh` per Tier 1 spec (installer update nudge).
