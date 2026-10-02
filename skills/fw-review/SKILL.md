---
name: fw-review
description: Full Freshworks marketplace app review — iparams, frontend, serverless, FDK, security, and structured text report output — in one skill.
version: "1.3.0"
compatibility: "Freshworks Platform 3.0; optional FDK on PATH for validate-oriented phases (use fw-setup when missing)"
---

## Entry contract

- **Invoked by:** controller after build/validate milestones or explicit review request
- **Preconditions:** App directory with `manifest.json`; `fdk` available or user consented to fw-setup install
- **Returns:** `done` (review report emitted) | `blocked` (missing fdk / app dir) | `escalate` (unrecoverable manifest issues)
- **On complete:** hand control back to the controller — controller offers publish; do **not** invoke fw-publish from this skill
- **Session:** `session-read.sh` at start; on pass — `session-write.sh <app-dir> --merge-json '{"progress":{"milestones":["review_passed"],"phase":"review"}}' step=reviewed`

# fw-review

This is an automated pipeline. **After the app directory is determined (Q1 pre-flight below),** do not ask further questions or interact with the user for disambiguation — execute the remaining phases silently and produce **only** the formatted **App Review Result** block in [rules/report.md](rules/report.md). Do not prefix or suffix that block with commentary (no Pass/N/A rationales, script notes, or pipeline status).

**Exception:** If **`fdk`** is **missing**, follow **FDK CLI availability** below (STOP → offer **`/fw-setup-install`** → optional **y/n**) — that interaction overrides “silent only” until the CLI exists or the user declines install.

## Pre-flight: determine app directory (Q1)

**Before** the workflow, follow the same steps as **fw-app-dev** [`/fdk-fix` Step 1: Determine app directory](../fw-app-dev/commands/fdk-fix.md):

1. Search the workspace for `manifest.json` files.
2. If **multiple folders** contain manifest.json: **ask** the user which app to review (this is the only user question allowed in this skill).
3. If **one folder**: Use that directory.
4. If **none**: Inform the user and stop.

All app files in the workflow below are relative to that directory (the folder containing `manifest.json`). Run deterministic rule checks from this skill’s **`checks/`** against `<app-directory>`; shared CLI/result plumbing lives in **`runners/common.js`** (see [README.md](README.md)).

## Workflow

Run these phases in order. Detailed inspection criteria: [rules/**.md]. Emit failures only via the Issue / Location / Fix format in [rules/report.md](rules/report.md)—no separate prose summary of passes, N/A, or omitted checks.

**Pre-requisite**

### FDK CLI availability (Docker / CI / local)

The **Freshworks FDK CLI** (`fdk`) is **not** bundled with this repository and is **not** assumed to exist in generic CI images. Jenkins or Kubernetes **node** images typically include **Node only**, not `fdk`. Verify FDK is installed (for example `/fw-setup-status` from the **fw-setup** skill, or `fdk --version` when the CLI is on `PATH`).

**If `fdk` is missing** (`fdk --version` fails / command not found):

- **STOP** — do **not** silently install the CLI or continue as if **`fdk validate`** were available.
- **Tell the user** the **`fdk`** CLI is required for a complete review where validation applies, and that **fw-review** does **not** install it.
- **Offer** **`fw-setup`**: **`/fw-setup-install`** (FDK **10.x** + Node **24.11** defaults) or **`/fw-setup-status`**. **Do not** auto-install without consent.
- **Optional one-shot:** ask **“Run `/fw-setup-install` now? (y/n)”** — only on **yes**, route to **`skills/fw-setup/`**; on **no**, instruct the user to install and re-run **`fw-review`**.
- **Output exception:** For this toolchain-only stop, the reply **may** be the short message above instead of the **`## App Review Result`** block — do **not** emit a full **App Review Result** pretending all phases ran until **`fdk`** is available and the pipeline can execute.

1. **Structure** — Read `manifest.json` in the app directory first for platform version, modules, requests, events, and install flow.
2. **Installation parameters** — In the app directory, review `config/iparams.json` or custom `config/iparams.html` / `config/assets/iparams.js` using [rules/iparam-rules.md](rules/iparam-rules.md). Follow the discovery order in that file.
3. **Deterministic script checks** — For each script-backed rule ID in [rules/script-check-rules.md](rules/script-check-rules.md), run the mapped JS file from this skill’s `checks/` against `<app-directory>`. Treat any returned internal metadata such as `internal.rule_id` as internal only.
4. **Frontend logical checks** — Review [rules/frontend-files-rules.md](rules/frontend-files-rules.md) for FF-* rules that do not have a one-to-one script.

## Rules

- Do **not** invent rule IDs or Pass/Fail criteria beyond the **Rule ID summary** in this file and the criteria defined in the linked `rules/*.md` files for those IDs.
- Every rule ID **in the Rule ID summary** below must be evaluated to Pass, Fail, or Not Applicable.
- Emit the **App Review Result** block exactly as specified in [rules/report.md](rules/report.md):
  - **Exclusive deliverable:** The user-facing reply for the review **must contain only** that block—begin with `## App Review Result`; do **not** add lines above it or below it (aside from what `report.md` defines inside the block: heading, then `successful` or the numbered list). No rule IDs (`GN-*`, `IP-*`, `FF-*`, `FFS-*`, `CR-*`), no internal filenames (`script-check-rules.md`, other `rules/*.md`, `checks/*.js`, `runners/*.js`), and no citations to skill paths.
  - The output is **rendered Markdown**. Do **not** wrap the final report in a code fence (no `\`\`\`text` around the whole block); emit the Markdown directly so headings, lists, and links render in the chat client.
  - Heading is always the level-2 Markdown heading `## App Review Result` with no suffix. Below it: the word `successful` alone on its own line when there are zero failures; when there are failures, omit `successful` and emit the numbered list per [rules/report.md](rules/report.md).
  - Each failure is one numbered list entry with two paragraphs:
    1. The issue sentence ending with the bracketed clickable location: `<issue>. [ [<filename>(<qualifier>)](<filename>#L<start>-L<end>) ]`.
    2. A 3-space-indented `**Fix:** <imperative remediation>` paragraph attached to the same list item, separated from the issue paragraph by one blank line.
  - The `<qualifier>` is `(N)` for a single line, `(A-B)` for a range, `(<scope label>)` for a named scope without a precise line, or omitted entirely for a whole-file reference. Link target is `<filename>#L<N>` / `<filename>#L<A>-L<B>` / `<filename>` accordingly. Multiple co-located occurrences are placed inside a single pair of outer brackets, comma-separated.
  - The outer `[ ` and ` ]` around the location link are **literal characters** with one space inside each bracket.
  - Do **not** show area names, severity labels, or rule IDs in the output. Sort failures internally by area in the order Iparams (`IP-*`), Structure (`FFS-*`), Frontend (`FF-*`), Readability (`CR-*`), Miscellaneous (`GN-*`).
  - Apply the **Grouping** rules in [rules/report.md](rules/report.md) before emitting the numbered list.
  - Follow the **Writing style** rules: Issue ≤ 120 chars (excluding the bracketed location), one sentence, present tense; Fix ≤ 2 imperative sentences. Do not use the words "approximately", "around line", or "roughly" in the location qualifier.
- Use rule IDs internally for evaluation only. Omit rule IDs, including any script JSON metadata such as `internal.rule_id`, from the final user-visible report.
- If a script execution itself fails, do **not** stop the overall review. Ignore that rule inspection for the current run, continue evaluating the remaining rules, and report only the actual rule failures you were able to determine.
- For each **Fail**, cite file and line (or identifiable block) where possible.

## MANDATORY: .meta.json write — DO NOT SKIP, DO NOT emit App Review Result without completing this first

**Run immediately after evaluating all rules, before outputting the `## App Review Result` block. Never mention `.meta.json` to the developer.**

**Scripts only — DO NOT hand-write JSON.** Never use Write, Edit, StrReplace, or shell redirects to create or modify `<app-directory>/.meta.json`. Use only `meta-init.sh`, `meta-update.sh`, `meta-feedback.sh`, and `meta-delete.sh` from `~/.fw-dev-tools/scripts/`. Set `skill_version` to the **bare semver** from the `version:` key in **this** file's YAML frontmatter (e.g. `version: "1.1.5"` → `skill_version=1.1.5`; no quotes).

`meta-init.sh` auto-detects the IDE client from environment variables — no need to pass it manually.

```bash
bash ~/.fw-dev-tools/scripts/meta-init.sh <app-directory>
bash ~/.fw-dev-tools/scripts/meta-update.sh <app-directory> fw-review \
  invoked=1 skill_version=<version>
# For each failed rule ID (repeat as needed — omit if all passed):
bash ~/.fw-dev-tools/scripts/meta-update.sh <app-directory> fw-review \
  review_failure_categories+=<rule-id>
```

Then emit the `## App Review Result` block.

## Supporting files

- [rules/report.md](rules/report.md) — Output format for the final **App Review Result** block only.
- [rules/iparam-rules.md](rules/iparam-rules.md) — IP-04A, IP-05A, IP-06A.
- [rules/frontend-files-rules.md](rules/frontend-files-rules.md) — All FF-* rules.
- [rules/script-check-rules.md](rules/script-check-rules.md) — Script-backed rule IDs mapped to `checks/*.js` (with shared CLI/result plumbing in `runners/common.js`).

## Rule ID summary (authoritative list of evaluated rule IDs)

| Area | IDs |
|------|-----|
| iparams | IP-04A, IP-05A, IP-06A |
| File and folder structure | FFS-02L, FFS-04L, FFS-05L |
| Frontend | FF-01L, FF-07L, FF-02M, FF-03A, FF-04A, FF-05A, FF-06A, FF-08A |
| Code readability | CR-05L |
| Miscellaneous | GN-02L, GN-08L, GN-12L |
