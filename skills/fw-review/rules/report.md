# App review report — emit format and rule index

Human-readable **summary** the pipeline prints after evaluating the rule IDs listed in the **Rule ID summary** in [SKILL.md](../SKILL.md). **Omit** lines for Pass and Not Applicable.

The output is **rendered Markdown**, not a fenced text block. Do not wrap the final report in triple backticks. Emit headings, bold text, lists, and links directly so the chat client renders them.

**Scope:** User-visible output from the review **is only** the content described in sections *No failures* / *One or more failures* below. Do **not** print a preamble or footnote explaining passes, omissions, scripts, missing FDK, or how N/A was chosen.

---

## User-visible output

### No failures

Print exactly (as rendered Markdown — `App Review Result` is a level-2 heading, `successful` is a normal line below it):

```markdown
## App Review Result

successful
```

The word **successful** is alone on its own line, lowercase.

### One or more failures

Print the **same** level-2 heading as the no-failures case (`## App Review Result`), with **no** suffix (do not append a failure count or “issues found”). Then print a numbered list with one entry per failure. Each entry is two lines: the **Issue** (with the file location appended at the end) and a **Fix** paragraph indented under the same list item.

Use this exact shape:

```markdown
## App Review Result

1. <issue text> [ <location link> ]

   **Fix:** <imperative remediation>

2. <issue text> [ <location link> ]

   **Fix:** <imperative remediation>
```

Where:

- `<issue text>` is one short, present-tense sentence describing what is wrong.
- `<location link>` is a clickable Markdown link rendered at the end of the issue line, **wrapped in literal `[ ` and ` ]` brackets with a single space inside each bracket**.
- The `**Fix:**` paragraph is indented with 3 spaces so it remains attached to the numbered list item.
- Sort failures internally by area in this order: Iparams (`IP-*`), Structure (`FFS-*`), Frontend (`FF-*`), Readability (`CR-*`), Miscellaneous (`GN-*`). The area itself is **not** shown in the output.

## Location format (end of issue line)

Each `Location` is rendered as a clickable Markdown link wrapped in literal brackets at the end of the issue sentence:

```markdown
[ [<filename>(<qualifier>)](<filename>#L<start>-L<end>) ]
```

The displayed link text follows the form `<filename>(<qualifier>)`, where `<qualifier>` is one of:

- **Single line** — `(N)`. Link target: `<filename>#L<N>`.
  - Example: `[ [app/app.js(255)](app/app.js#L255) ]`
- **Line range** — `(A-B)`. Link target: `<filename>#L<A>-L<B>`.
  - Example: `[ [config/iparams.json(9-13)](config/iparams.json#L9-L13) ]`
- **Named scope (no precise line)** — `(<scope label>)`. Link target: `<filename>` (no fragment).
  - Example: `[ [config/iparams.json(field "domain")](config/iparams.json) ]`
  - Example: `[ [app/app.js(downloadAttachment)](app/app.js) ]`
- **Whole file** — no qualifier, just `<filename>`. Link target: `<filename>`.
  - Example: `[ [app/template.html](app/template.html) ]`

Rules:

- The link **text** must include the filename and (when known) the qualifier in parentheses, so the location remains readable even when not rendered as a link.
- The link **target** must be a relative path from the app root. No `https://`, no `file://`, no absolute filesystem paths.
- The outer `[ ` and ` ]` brackets are **literal characters** in the output, with one space after `[` and one space before `]`. They are part of the visual format, not Markdown syntax.
- Place the bracketed location at the **end of the issue sentence**, after the terminal punctuation. Example: `… is not validated. [ [config/iparams.json(9-13)](config/iparams.json#L9-L13) ]`
- For multiple co-located occurrences, place all links inside a single pair of outer brackets, separated by `, `:
  - `[ [app/app.js(255)](app/app.js#L255), [app/app.js(318)](app/app.js#L318) ]`
- Do **not** use the words `approximately`, `around line`, or `roughly`. Either give a real line or range, or use a named scope.

## Layout requirements

- **Only** rules with result **Fail** appear; do not list passing or N/A rules.
- The header is always the Markdown level-2 heading `## App Review Result` (no em dash suffix, no count). Do not use plain text or wrap the report in a code fence.
- Each failure is a single numbered list entry. The first paragraph is the issue line ending with the bracketed location link. The second paragraph (indented 3 spaces) starts with `**Fix:**`.
- Separate the issue paragraph and the Fix paragraph with one blank line. Separate consecutive numbered entries with one blank line.
- Do **not** include internal **rule IDs** (e.g. `GN-02L`, `IP-04A`, `FFS-04L`, `FF-07L`, `CR-05L`), **area labels** shown to the user (`Iparams`, `Miscellaneous`), severity labels, or internal JSON metadata such as `internal.rule_id` anywhere in emitted output—including any line intended for the developer reading the chat.
- Do **not** cite this skill’s **markdown or script paths** in emitted output (`script-check-rules.md`, `iparam-rules.md`, other `rules/*.md`, `checks/*.js`, `runners/*.js`).
- Do **not** wrap the final report in triple backticks.

## Writing style

### Issue (≤ 120 characters before the location, one sentence)

- One short, present-tense sentence stating **what is wrong**, not how to fix it.
- No marketing tone, no hedging ("may", "might"), no rule IDs, no implementation suggestions.
- End the sentence with normal punctuation, then a single space, then the bracketed location link.
- Good: `Domain iparam accepts URLs containing http(s):// schemes. [ [config/iparams.json(9-13)](config/iparams.json#L9-L13) ]`
- Bad: `Host-style iparam field accepts values with http(s):// instead of hostname-only input which violates the platform expectation.`

### Fix (≤ 2 short sentences, imperative voice)

- Start with a verb: `Add`, `Replace`, `Remove`, `Move`, `Reject`, `Strip`, `Declare`, `Vendor`, `Use`, `Wrap`.
- Say **what to change**, not why. The Issue line already explains the problem.
- Reference the relevant **Fix messages** / **Goal** / **Pass** sections in [iparam-rules.md](iparam-rules.md), [frontend-files-rules.md](frontend-files-rules.md), and [script-check-rules.md](script-check-rules.md) for canonical wording.
- Good: `Reject values matching /^https?:\/\//i in the domain field and update the hint to show host-only input (e.g. api.example.com).`
- Bad: `It would be better to add some kind of validation that handles the protocol so that users do not enter URLs because the platform expects only hostnames.`

## Grouping

Combine multiple raw findings into a **single numbered entry** when **all** of the following are true:

1. They map to the same internal area (`IP-*`, `FFS-*`, `FF-*`, `CR-*`, `GN-*`).
2. They cite the same file (or the same field within one file), **or** they share the same root cause and the Fix sentence is identical.

When grouping:

- Place all location links inside one pair of outer `[ … ]` brackets, comma-separated.
- Write the issue sentence to describe the shared failure pattern, not each instance.
- Do not group across different areas or fundamentally different fixes.

If two rules flag the **same field with overlapping fixes** (for example IP-04A and IP-05A both flagging the same `domain` field), merge them into one entry whose Fix composes the corrective actions.

## Examples

### Example — failures (with grouping)

The agent emits the following Markdown directly (not inside a code fence):

```markdown
## App Review Result

1. Domain iparam accepts URLs containing http(s):// and lacks hostname-format validation. [ [config/iparams.json(9-13)](config/iparams.json#L9-L13) ]

   **Fix:** Reject values matching /^https?:\/\//i, add a hostname regex, and update the hint to show host-only input (e.g. api.example.com).

2. API token is embedded as a literal string in client source. [ [app/app.js(42)](app/app.js#L42) ]

   **Fix:** Move the token to a secure iparam and read it via the platform iparams API at runtime.

3. Client code uses raw fetch() for platform-related HTTP instead of the Request API. [ [app/app.js(255)](app/app.js#L255), [app/app.js(318)](app/app.js#L318) ]

   **Fix:** Replace fetch() with client.request.invokeTemplate using a request template declared in config/requests.json.

4. Imported library is never referenced after import. [ [app/app.js(3)](app/app.js#L3) ]

   **Fix:** Remove the unused import or use the library in the file.
```

### Example — single failure with named scope

```markdown
## App Review Result

1. Required iparam has no client-side validation before save. [ [config/assets/iparams.js(validate)](config/assets/iparams.js) ]

   **Fix:** Validate the field before invoking postConfigs and surface a specific error when empty.
```

### Example — success

```markdown
## App Review Result

successful
```

## Anti-patterns — do NOT do this

### Preamble or footnote exposing rule IDs or skill files

Invalid (anything before `## App Review Result` that names a rule ID, cites `rules/*.md` / `checks/*.js` / `runners/*.js`, or explains Pass/N/A omissions):

```markdown
GN-02L is Not applicable when FDK is missing on PATH (per `script-check-rules.md`); …

## App Review Result

…
```

Correct: start **only** with `## App Review Result`; omit pipeline narrative entirely.

### Wrapping the entire report in a code fence

Invalid (the report is shown as raw text, no rendering, links are not clickable):

````markdown
```text
App Review Result

1. ...
```
````

Correct: emit the Markdown directly without the surrounding `text` fence.

### Separate Location bullet or label

Invalid (Location must be embedded at the end of the issue line, not on its own):

```markdown
1. Domain iparam accepts URLs containing http(s):// schemes.

   **Location:** config/iparams.json line 9
   **Fix:** ...
```

Correct:

```markdown
1. Domain iparam accepts URLs containing http(s):// schemes. [ [config/iparams.json(9)](config/iparams.json#L9) ]

   **Fix:** ...
```

### Plain-text location instead of a clickable link

Invalid:

```markdown
1. Client code uses raw fetch(). [ app/app.js(255) ]
```

Correct:

```markdown
1. Client code uses raw fetch(). [ [app/app.js(255)](app/app.js#L255) ]
```

### Area or severity tag in the output

Invalid:

```markdown
1. [Frontend] Client code uses raw fetch(). [ [app/app.js(255)](app/app.js#L255) ]
```

```markdown
1. **[Iparams · Major]** Domain iparam accepts URLs ...
```

Correct:

```markdown
1. Client code uses raw fetch(). [ [app/app.js(255)](app/app.js#L255) ]
```

### Absolute or external location URL

Invalid:

```markdown
1. ... [ [app/app.js(255)](https://github.com/org/repo/blob/main/app/app.js#L255) ]
```

Correct (relative path from app root):

```markdown
1. ... [ [app/app.js(255)](app/app.js#L255) ]
```

### Verbose, hedged Issue

Invalid:

```markdown
1. It appears that the iparam field for the domain might possibly accept values that include http or https schemes which is not ideal because the platform typically expects only hostnames. [ [config/iparams.json(9-13)](config/iparams.json#L9-L13) ]
```

Correct:

```markdown
1. Domain iparam accepts URLs containing http(s):// schemes. [ [config/iparams.json(9-13)](config/iparams.json#L9-L13) ]
```

### Vague location qualifier

Invalid:

```markdown
1. ... [ [app/app.js(around 255 approximately)](app/app.js) ]
```

Correct:

```markdown
1. ... [ [app/app.js(255)](app/app.js#L255) ]
```

Or, when the line genuinely cannot be pinpointed, use a named scope:

```markdown
1. ... [ [app/app.js(downloadAttachment)](app/app.js) ]
```

### Fix that re-explains the Issue

Invalid:

```markdown
   **Fix:** The problem here is that the code uses fetch which is not the right way to do HTTP on the platform so you should change this so it uses the platform Request API instead.
```

Correct:

```markdown
   **Fix:** Replace fetch() with client.request.invokeTemplate using a request template from config/requests.json.
```
