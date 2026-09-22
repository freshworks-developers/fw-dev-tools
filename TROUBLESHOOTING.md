# Skills Troubleshooting Guide

**Fix issues with Freshworks skills in Cursor, Claude Code, and OpenAI Codex**

This guide covers **real problems you'll actually encounter** when installing and using these skills, not generic advice. **Codex** loads **`~/.codex/skills/*/SKILL.md`** after installer setup; many slash-command and Cursor-rule checks below do not apply there—see [Codex-specific problems](#codex-specific-problems).

**Before GitHub Issues:** use **[ISSUES.md](ISSUES.md)** — **mandatory** issue-body template + checklists (issues without the template may be closed).

**Corporate networks / TLS / proxy:** **[docs/network-requirements.md](docs/network-requirements.md)**.

---

## Quick Start: Is Your Skill Broken?

### Test 1: Are skills installed?

**Cursor:**
```bash
ls ~/.cursor/skills/
# Should show: fw-app-dev  fw-build-your-mcp-app  fw-review  fw-setup  fw-publish (subset depends on what you installed)
```

**Claude Code:**
```bash
claude plugin list
# Should show entries for fw-setup, fw-app-dev, fw-build-your-mcp-app, fw-review, fw-publish

ls ~/.fw-dev-tools/skills/fw-app-dev/SKILL.md
# Authoritative skill copy for plugins (version in YAML frontmatter should match your install)

# Stale flat copies here shadow the plugin — see Issue #11 if versions look wrong:
ls ~/.claude/skills/fw-* 2>/dev/null || true
```

**OpenAI Codex:**
```bash
ls ~/.codex/skills/fw-app-dev/SKILL.md
grep -q 'fw-dev-tools' ~/.codex/AGENTS.md && echo "routing OK"
```

**If missing:** Run `npx @freshworks/fw-dev-tools install` or see [Installation](#installation-from-scratch).

---

### Test 2: Do commands work?

**In Cursor or Claude Code, type:**
```
/fdk-fix
```

- ✅ Command shows in autocomplete → Commands work
- ❌ "Command not found" → See [Issue #3: Commands Don't Show Up](#issue-3-commands-dont-show-up)

---

### Test 3: Do rules apply? (Cursor only)

**Create a test file `test.js`:**
```javascript
const result = await $request.post('https://api.example.com', {});
```

**Expected:** Cursor immediately warns you:
```
❌ Platform 3.0: Use $request.invokeTemplate() not .post()
```

**If no warning:** Rules aren't loading. See [Issue #1](#issue-1-cursor-rules-not-loading-after-installation).

---

---

## How Skills Actually Work

**Claude Code:**
- Skills ship via **local marketplace** at `~/.fw-dev-tools/` (plugins + `skills/`)
- Routing block in `~/.claude/CLAUDE.md` points agents to `~/.fw-dev-tools/skills/fw-<name>/SKILL.md`
- **Do not** rely on flat copies in `~/.claude/skills/fw-*` — they can be stale (Issue #11)
- Commands are plugin slash commands; enforcement is in **SKILL.md** (no separate `.mdc` rules layer)

**Cursor:**
- Needs THREE things to work:
  1. `SKILL.md` - The main skill
  2. `.cursor-plugin/plugin.json` - Config file
  3. `rules/*.mdc` - Rule files that enforce patterns
- If ANY of these are broken, parts of the skill won’t work

**OpenAI Codex:**
- Installer copies skills to **`~/.codex/skills/fw-<name>/SKILL.md`**
- Routing spec in **`~/.codex/AGENTS.md`** (from `fw-dev-tools-spec.md`)
- **`SKILL.md`** is the source of truth; no slash-command autocomplete
- YAML **`description`** in frontmatter must be **≤ 1024 characters** or Codex refuses to load the skill (Issue #12)
- Optional **MCP** for **fw-publish**; token setup is client-specific—see **AGENTS.md**

**Key Difference:**
- Claude Code: Plugin + `~/.fw-dev-tools/skills/`; stale flat copies break routing (Issue #11)
- Cursor: Install and it might need rule/plugin fixes (Issues #1–#4)
- Codex: Installer paths + `AGENTS.md`; auth and description limits matter (Issues #12–#13)

---

## Installation from Scratch

### Method 1: Installer (Recommended)

```bash
npx @freshworks/fw-dev-tools install
```

Auto-detects Cursor, Claude Code, and Codex. Copies all skills, writes the orchestration spec, and merges the MCP config.

**Target a specific client:**
```bash
npx @freshworks/fw-dev-tools install --tools cursor
```

**Then restart your IDE.**

**If the installer fails** (network issues, corporate proxy), use Method 2.

---

### Method 2: Manual Installation (Fallback)

```bash
# 1. Clone the repo
cd ~/Downloads
git clone https://github.com/freshworks-developers/fw-dev-tools.git
cd fw-dev-tools

# 2. For Cursor:
mkdir -p ~/.cursor/skills
cp -r skills/fw-* ~/.cursor/skills/

# 2. For Claude Code:
mkdir -p ~/.fw-dev-tools
cp -r skills ~/.fw-dev-tools/
cp -r .claude-plugin ~/.fw-dev-tools/
claude plugin marketplace add ~/.fw-dev-tools
claude plugin install fw-setup@freshworks-dev-tools
claude plugin install fw-app-dev@freshworks-dev-tools
claude plugin install fw-build-your-mcp-app@freshworks-dev-tools
claude plugin install fw-review@freshworks-dev-tools
claude plugin install fw-publish@freshworks-dev-tools

# 2. For Codex:
mkdir -p ~/.codex/skills
cp -r skills/fw-* ~/.codex/skills/

# 3. Verify installation
ls ~/.cursor/skills/fw-app-dev/SKILL.md   # Cursor
claude plugin list                         # Claude Code — should list all 5 skills
ls ~/.codex/skills/fw-app-dev/SKILL.md    # Codex

# 4. Restart your IDE completely (close ALL windows)
```

**Note:** Manual installs don't get the routing spec or MCP merge. For Claude Code, also add the routing block to `~/.claude/CLAUDE.md` manually (copy contents of `installer/src/specs/fw-dev-tools-spec.md`). For Codex, append it to `~/.codex/AGENTS.md`. Prefer Method 1 when possible.

**Verify it worked:**
- Type `/fdk` and see if commands autocomplete
- For Cursor: Test rules with the Platform 2.x code test above
- **For Codex:** `ls ~/.codex/skills/fw-app-dev/SKILL.md` and confirm `~/.codex/AGENTS.md` has fw-dev-tools routing. For MCP publish failures, see **[Codex-specific problems](#codex-specific-problems)**.

---

## Codex-specific problems

**Skills missing after install:** Re-run `npx @freshworks/fw-dev-tools install --tools codex --yes`, then **restart Codex**. Verify `~/.codex/skills/fw-app-dev/SKILL.md` and `~/.codex/AGENTS.md`.

**”Slash commands don't work” on Codex:** Expected. Prefer natural-language prompts that reference **`SKILL.md`** sections (same rules as **`AGENTS.md`**: **`SKILL.md` is authoritative**).

**`failed to load skill` — description exceeds 1024 characters:** Codex enforces a **1024-character limit** on the YAML `description:` field in `SKILL.md`. Run `npx @freshworks/fw-dev-tools update` to get a release within the limit.

**`token_revoked` / HTTP 401 on Codex:** Your ChatGPT login expired. Run `codex logout && codex login`, then restart Codex.

**MCP tools missing or HTTP 401 on publish:** Configure **`fw-dev-mcp`** JWT per **[AGENTS.md](AGENTS.md)** and **[skills/fw-publish/](skills/fw-publish/)**. The installer writes MCP config to **`~/.codex/mcp.json`** (same `mcpServers` shape as the repo **[.mcp.json](.mcp.json)**); put your JWT in the client-supported form (typically `Authorization: Bearer <your-jwt>`). Re-run `npx @freshworks/fw-dev-tools install --tools codex --yes` from any directory — MCP path does not depend on your shell cwd. This is separate from Codex CLI login.

---

## Known Issues

### Issue #1: Cursor Rules Not Loading After Installation

**What You See:**
```
Installed skill via npx or git clone
Commands show up and work
But rules don't apply - no Platform 3.0 enforcement
Can write Platform 2.x code without warnings
```

**What's Actually Wrong:**
The skill you installed has a broken or outdated `plugin.json` file. It's missing the `rulesDirectory` declaration that tells Cursor where the rules are.

**Why This Happens:**
- Skill was built for older Cursor versions (pre-0.40)
- Skill developer forgot to add `rulesDirectory` field
- You installed from an old branch/tag

**Check If This Is Your Issue:**
```bash
cat ~/.cursor/skills/fw-app-dev/.cursor-plugin/plugin.json
```

Look for these lines:
```json
{
  "rulesDirectory": "./rules",
  "commandsDirectory": "./commands"
}
```

**If missing, you need to manually fix the skill:**

```bash
cd ~/.cursor/skills/fw-app-dev/

# Backup original
cp .cursor-plugin/plugin.json .cursor-plugin/plugin.json.backup

# Add the missing fields
# Edit .cursor-plugin/plugin.json and add these lines after "name":
# "rulesDirectory": "./rules",
# "commandsDirectory": "./commands",
```

**Or edit directly:**
```bash
# For macOS/Linux:
cat .cursor-plugin/plugin.json | \
  python3 -c "import sys,json; d=json.load(sys.stdin); d['rulesDirectory']='./rules'; d['commandsDirectory']='./commands'; print(json.dumps(d,indent=2))" \
  > .cursor-plugin/plugin.json.new && \
  mv .cursor-plugin/plugin.json.new .cursor-plugin/plugin.json
```

**After fixing, restart Cursor.**

**Verify it worked:**
- Open a `.js` file
- Write Platform 2.x code like `$request.post('url', {})`
- Cursor should immediately warn you
- If no warning, check Issue #2 (duplicate rules)

---

### Issue #2: Duplicate Rules/Commands in `.cursor/` Subdirectories

**Symptom:**
```
Have both:
  skills/fw-app-dev/rules/*.mdc
  skills/fw-app-dev/.cursor/rules/*.mdc

Cursor only finds one or gets confused
Updates don't apply
```

**Root Cause:**
Legacy structure from pre-0.40 Cursor versions. Old pattern was:
```
skill/
└── .cursor/
    ├── rules/
    └── commands/
```

New pattern (post-0.40, multi-IDE compatible):
```
skill/
├── .cursor-plugin/plugin.json  # Config only
├── rules/                      # IDE-agnostic
└── commands/                   # IDE-agnostic
```

**Technical Details:**
- Cursor changed skill loading in v0.40+
- `.cursor/` subdirs are now IGNORED
- Only root-level `rules/` and `commands/` with plugin.json declaration
- Duplicates cause undefined behavior (which one loads?)

**Fix:**
```bash
cd ~/.cursor/skills/fw-app-dev/

# Remove old structure
rm -rf .cursor/commands
rm -rf .cursor/rules
# Keep .cursor-plugin/ for config

# Verify rules at root
ls -la rules/
ls -la commands/
```

**Verification:**
```bash
# Should NOT exist:
ls .cursor/rules 2>&1 | grep "No such file"
ls .cursor/commands 2>&1 | grep "No such file"

# SHOULD exist:
ls rules/*.mdc | wc -l  # > 0
ls .cursor-plugin/plugin.json  # exists
```

---

### Issue #3: Commands Don't Show Up

**What You See:**
```
Type /fdk-fix
Nothing happens - no autocomplete, no command
Type / and see other commands but not the skill commands
```

**Quick Check - Is the skill actually installed?**
```bash
# Cursor
ls ~/.cursor/skills/fw-app-dev/SKILL.md
ls ~/.cursor/skills/fw-app-dev/commands/

# Claude Code
claude plugin list
# Should show fw-app-dev in the list
```

**If missing:** Skill isn't installed. See [Installation from Scratch](#installation-from-scratch).

**If installed but commands still don't work:**

**Option 1: Restart your IDE** (close ALL windows, reopen)
- Most common fix for command discovery

**Option 2: Reinstall the skill**
```bash
# For Cursor - remove and reinstall
rm -rf ~/.cursor/skills/fw-app-dev
# Then follow installation steps again

# For Claude Code - uninstall and reinstall
npx @freshworks/fw-dev-tools install
```

**Option 3: The skill is broken**

Check if command files actually exist:
```bash
ls ~/.cursor/skills/fw-app-dev/commands/*.md
```

**Should see files like:**
```
fdk-fix.md
fdk-migrate.md
fdk-refactor.md
```

**If you see NO .md files or they're in wrong location:**
- The skill you installed is broken
- Report it: https://github.com/freshworks-developers/fw-dev-tools/issues
- Include: "Commands missing from fw-app-dev skill" + what you see when you run `ls` above

**For Claude Code specifically:**

Ask Claude directly:
```
What skills do you have loaded? List all commands.
```

If Claude doesn't list `/fdk-fix`, `/fdk-migrate` etc., the SKILL.md file is broken. Report this as a bug.

---

### Issue #4: Cursor Rules Exist But Never Apply

**What You See:**
```
Skill installed, rules folder has .mdc files
But Platform 2.x code doesn't trigger warnings
Rules just... don't work
```

**Quick Test:**
```bash
# Check if rules exist
ls ~/.cursor/skills/fw-app-dev/rules/*.mdc

# Should show multiple .mdc files
```

**If you see files but rules still don't apply:**

This is usually **Issue #1** (plugin.json missing rulesDirectory). Go back to [Issue #1](#issue-1-cursor-rules-not-loading-after-installation) first.

**If Issue #1 is fixed and rules STILL don't work:**

The skill developer broke the rule files. This is a skill bug, not your fault.

**Report it:**
```bash
# Get diagnostic info
cd ~/.cursor/skills/fw-app-dev/
cat .cursor-plugin/plugin.json | grep rules
ls -la rules/*.mdc
```

Post this output at: https://github.com/freshworks-developers/fw-dev-tools/issues

**Temporary Workaround:**
Reinstall from the latest version (skill may have been fixed):
```bash
rm -rf ~/.cursor/skills/fw-app-dev
# Reinstall using Method 2 (manual installation)
```

---

### Issue #5: Skills in Wrong Directory Structure

**Symptom:**
```
Installed to:
  ~/.cursor/skills/fw-dev-tools/skills/fw-app-dev/

Instead of:
  ~/.cursor/skills/fw-app-dev/
```

**Root Cause:**
`npx @freshworks/fw-dev-tools install` or `git clone` created extra nesting.

**Technical Details:**
Cursor skill loader expects:
```
~/.cursor/skills/
├── fw-app-dev/
│   └── SKILL.md
└── fw-setup/
    └── SKILL.md
```

Not:
```
~/.cursor/skills/
└── marketplace/
    └── skills/
        ├── fw-app-dev/
        └── fw-setup/
```

Extra layers are ignored.

**Fix:**
```bash
cd ~/.cursor/skills/

# If you have marketplace/ wrapper:
mv marketplace/skills/* .
rm -rf marketplace

# Verify
ls -la fw-app-dev/SKILL.md
ls -la fw-setup/SKILL.md
```

**Why This Happens:**
- Cloning entire repo instead of just skills
- Running installer with wrong path syntax
- Manual copy included parent directories

---

### Issue #6: Permission Denied on macOS (Gatekeeper)

**Symptom:**
```bash
./scripts/fw-setup-run-background.sh
# zsh: operation not permitted
```

**Root Cause:**
macOS Gatekeeper blocking unsigned scripts.

**Technical Details:**
macOS 13+ Ventura requires:
- Scripts to be signed OR
- Quarantine attribute removed OR  
- Explicitly allowed in System Settings

**Fix (Quick):**
```bash
cd ~/.fw-dev-tools/scripts/

# Remove quarantine attribute
xattr -r -d com.apple.quarantine .

# Make executable
chmod +x *.sh
```

**Fix (Proper):**
System Settings → Privacy & Security → "Allow apps from: App Store and identified developers"

Then allow the script when prompted.

**Verification:**
```bash
xattr -l ~/.fw-dev-tools/scripts/meta-init.sh
# Should NOT show com.apple.quarantine
```

---

### Issue #7: Some Rules Work, Others Don't (Cursor)

**What You See:**
```
Some rules trigger warnings
Other rules never do
Inconsistent enforcement
```

**This means:**
- Skill is partially working
- Some rule files are broken
- Others are fine

**What You Should Do:**

**Don't try to debug this yourself.** This is a skill developer issue.

**Report it with specifics:**
1. Which rules work (give example of code that triggers warning)
2. Which rules don't (give example of code that should warn but doesn't)
3. Post at: https://github.com/freshworks-developers/fw-dev-tools/issues

**Example good bug report:**
```markdown
Platform 3.0 rule works:
- Writing $request.post() triggers warning ✅

Complexity rule doesn't work:
- Writing function with 15 if statements, no warning ❌

Environment:
- Cursor version: 0.41.3
- Skill: fw-app-dev
- Rules exist: ls ~/.cursor/skills/fw-app-dev/rules/*.mdc shows 9 files
```

---

### Issue #8: Claude Code Not Following Skill Instructions

**What You See:**
```
Claude Code loads the skill
But doesn't follow the rules/patterns
Accepts Platform 2.x code when it shouldn't
```

**Reality Check:**

Claude Code doesn't have Cursor's automatic rule enforcement. It relies on:
1. What's written in SKILL.md
2. Claude actually reading and following it

**If Claude isn't enforcing Platform 3.0:**

Ask Claude directly:
```
Are you enforcing Platform 3.0 rules? What should I use instead of $request.post()?
```

**If Claude says "I don't have Platform 3.0 rules":**
- The skill isn't loaded, **or** Claude is reading a **stale copy** (Issue #11)
- Reinstall: `npx @freshworks/fw-dev-tools install --tools claude --yes`

**If Claude says "Yes, use $request.invokeTemplate()":**
- Skill IS working
- Claude just missed this one instance
- Remind Claude: "This violates Platform 3.0, fix it"

**Claude Code is more flexible but less strict than Cursor.**

If you want **automatic enforcement**, use Cursor.  
If you want **guidance but not enforcement**, Claude Code is fine.

---

### Issue #9: Skills Stopped Working After Cursor Update

**What You See:**
```
Updated Cursor to latest version
Skills disappeared or stopped working
Commands gone
```

**This happens when:**
Cursor changed how skills work between versions. Your old skill format is outdated.

**Fix: Reinstall the skills**

```bash
# Easiest: re-run the installer
npx @freshworks/fw-dev-tools install

# Then restart Cursor (close ALL windows)
```

**If the installer doesn't resolve it** (rare), reinstall manually:
```bash
# 1. Remove old skills
rm -rf ~/.cursor/skills/fw-app-dev
rm -rf ~/.cursor/skills/fw-setup

# 2. Reinstall latest version
cd ~/Downloads
git clone https://github.com/freshworks-developers/fw-dev-tools.git
cd fw-dev-tools
cp -r skills/fw-app-dev ~/.cursor/skills/
cp -r skills/fw-setup ~/.cursor/skills/

# 3. Restart Cursor (close ALL windows)
```

**Why reinstalling works:**
- Latest skill format is compatible with latest Cursor
- Old skills + new Cursor = broken
- Fresh install = everything matches

**After reinstalling:**
- Test commands: Type `/fdk` and see autocomplete
- Test rules: Write `$request.post()` and see if warning appears

---

### Issue #10: Git Cloning Skills Gets Wrong Files

**Symptom:**
```bash
git clone https://github.com/freshworks-developers/fw-dev-tools.git
cd fw-dev-tools/

# Now what? How do I install skills?
```

**Root Cause:**
This repo is a MONOREPO. Skills are in `skills/` subdirectory.

**Correct Installation from Git Clone:**

```bash
# 1. Clone repo
git clone https://github.com/freshworks-developers/fw-dev-tools.git
cd fw-dev-tools/

# 2. For Cursor:
cp -r skills/fw-app-dev ~/.cursor/skills/
cp -r skills/fw-setup ~/.cursor/skills/

# 3. For Claude Code — use installer, not flat copy:
npx @freshworks/fw-dev-tools install --tools claude --yes

# 4. Restart IDE
```

**Do NOT:**
```bash
# ❌ Wrong:
cp -r marketplace ~/.cursor/skills/

# ❌ Wrong:
ln -s $(pwd) ~/.cursor/skills/fw-dev-tools

# ❌ Wrong:
mv marketplace ~/.cursor/skills/
```

**Why:**
IDE expects each skill in its own directory under `~/.cursor/skills/`, not a wrapper repo.

---

## Configuration Reference

### Cursor plugin.json Schema

**Minimal Required:**
```json
{
  "name": "skill-name",
  "rulesDirectory": "./rules",
  "commandsDirectory": "./commands"
}
```

**Full Schema:**
```json
{
  "name": "skill-name",
  "displayName": "Human Readable Name",
  "version": "1.0.0",
  "description": "What this skill does",
  "author": {
    "name": "Author Name",
    "email": "author@example.com"
  },
  "homepage": "https://github.com/...",
  "repository": "https://github.com/...",
  "license": "MIT",
  "keywords": ["freshworks", "fdk"],
  "category": "developer-tools",
  "tags": ["automation"],
  "rulesDirectory": "./rules",
  "commandsDirectory": "./commands",
  "commands": [
    {
      "name": "command-name",
      "description": "What command does",
      "file": "commands/command-name.md"
    }
  ]
}
```

**Critical Fields:**
- `name` - Used for skill identification (must match directory name)
- `rulesDirectory` - WHERE rules are (relative to plugin.json)
- `commandsDirectory` - WHERE commands are (relative to plugin.json)

---

### Claude Code SKILL.md Schema

**Minimal Required:**
```yaml
---
name: skill-name
description: What this skill does
---

# Skill Content Here
```

**Full Schema:**
```yaml
---
name: skill-name
description: Multi-line description of what skill does and when to use it
compatibility: Platform versions, Node versions, etc
argument-hint: "[optional-args]"
allowed-tools: "shell read write grep"
---

# Skill Title

Instructions for agent...

## Progressive Disclosure

For X, load `references/x.md`
For Y, load `references/y.md`
```

**Critical Fields:**
- `name` - Skill identifier
- `description` - When to use this skill (agent decision making)
- Content after frontmatter - The actual skill instructions

---

### Rule (.mdc) File Schema

**Minimal Required:**
```yaml
---
name: rule-name
description: What this rule enforces
---

# Rule Content
```

**Full Schema:**
```yaml
---
name: rule-name
description: What this rule enforces
alwaysApply: true
globs: ["**/*.js", "**/*.ts"]
---

# Rule Title

Enforcement logic...
```

**Critical Fields:**
- `name` - MUST match filename (without `.mdc`)
- `alwaysApply` - `true` = load automatically, `false` = on-demand
- `globs` - File patterns that auto-trigger this rule

---

## Debugging Techniques

### Enable Cursor Dev Tools

```
Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)
Type: "Toggle Developer Tools"
```

**Console Tab:**
Look for skill loading errors:
```
Failed to load skill: fw-app-dev
Error: rulesDirectory not specified
```

**Network Tab:**
Check if skill files are being fetched (for remote skills)

---

### Check Claude Code Context

Ask Claude:
```
What skills do you have loaded?
List all rules you're enforcing
What commands are available from skills?
```

Should respond with accurate list. If not, skill didn't load.

---

### Verify File Permissions

```bash
# All files should be readable
find ~/.cursor/skills/fw-app-dev -type f ! -perm -u=r

# Should output nothing
# If shows files, fix with:
chmod -R u+r ~/.cursor/skills/fw-app-dev
```

---

### Test Rule Application (Cursor)

Create test file that violates a rule:

**Test for Platform 3.0 enforcement:**
```javascript
// test-violation.js
const data = await $request.post('https://api.example.com', {
  body: { test: true }
});
```

Save file. Cursor should immediately warn:
```
Platform 3.0 enforcement: Use $request.invokeTemplate() not .post()
```

If no warning, rule not applying. Check:
1. Rule has `alwaysApply: true`
2. plugin.json has `rulesDirectory`
3. Rule name matches filename

---

## Advanced Configuration

### Custom Skill Directory

**Cursor:**
Not supported. Must use `~/.cursor/skills/`

**Claude Code:**
Check settings for custom path option (may vary by version)

---

### Multi-Project Skills

**Problem:** Different projects need different skill versions

**Solution:** Use project-level skill overrides (if supported)

**For now:** Install globally, use project-specific `.nvmrc` or similar for environment differences

---

### Skill Priority/Loading Order

**Cursor:**
- `alwaysApply: true` rules load first
- Then file-pattern-matched rules (globs)
- Then on-demand rules

**Claude Code:**
- SKILL.md always loaded
- References loaded on-demand when mentioned
- No priority system (all context is equal)

---

## Known Limitations

### Cursor
- Cannot have skills in custom directories
- Rule globs limited to simple patterns (no regex)
- No skill dependency system (skill A requires skill B)
- Commands cannot call other commands directly

### Claude Code
- No automatic rule system (must be in SKILL.md)
- Progressive disclosure relies on explicit mentions
- Large skills consume context window
- No multi-skill coordination

### OpenAI Codex
- Slash commands (`/fdk-fix`, `/fw-setup-*`) are **not** guaranteed; use **`SKILL.md`** workflows explicitly
- Must install plugin from **repository root** (see [.codex-plugin/plugin.json](.codex-plugin/plugin.json))
- MCP token wiring is client-specific; follow **AGENTS.md** and **fw-publish**

---

## Getting Help

Use **[ISSUES.md](ISSUES.md)** at the repository root for:

- What **not** to paste (secrets)
- The **mandatory** **issue body template** (filled in) plus **checkboxes** for attachments (validate, pack, zip layout, publish HTTP codes, MCP errors)
- **Skill-install** diagnostic commands when skills fail to load

**Quick reminders:** avoid generic lines like “my skill doesn’t work” without context; include **IDE + version**, **exact errors**, **minimal repro**, and what you already tried from this guide.

**Report issues:** [https://github.com/freshworks-developers/fw-dev-tools/issues](https://github.com/freshworks-developers/fw-dev-tools/issues)

---

**Last Updated:** 2026-06-16
