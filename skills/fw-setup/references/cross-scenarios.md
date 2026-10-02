# Cross-Scenario FDK Setup: Detailed Subagent Specifications

> **Comprehensive subagent prompts for all FDK setup scenarios including migrations, version management, and troubleshooting. Users should upgrade or downgrade FDK versions, not maintain multiple FDK installations.**

**Shell Task closeout (same as slash commands):** Every `Task({ subagent_type: "shell", ...})` below must **return** after verification and final summary. Do not start `fdk run`, `fdk tunnel`, `tail -f`, or dev servers inside that Task; use `scripts/fw-setup-run-background.sh` from the app root if the user needs a running server.

## Table of Contents

1. [Legacy Migration (FDK 9.x → 10)](#scenario-1-legacy-migration)
2. [Existing Node Installation](#scenario-2-existing-node)
3. [Modernize Older App to Platform 3.0](#scenario-3-modernize-older-app-to-platform-30)
4. [Troubleshooting Broken FDK](#scenario-4-troubleshooting)
5. [Install Specific FDK Version](#scenario-5-install-specific-fdk-version)
6. [Node PATH Mismatch](#scenario-6-node-path-mismatch)
7. [Multiple Node Versions (Team Development)](#scenario-7-multiple-node-versions-team-development)

---

## Scenario 1: Legacy Migration (FDK 9.x → 10)

### Context

User currently has:
- FDK 9.x installed
- Node.js 18.x
- Wants to upgrade to FDK 10.x + Node 24

### Goals

- Preserve Node 18 for legacy projects
- Install Node 24 for FDK 10
- Seamless migration with zero data loss
- Maintain ability to switch back if needed

### Subagent Prompt

```javascript
Task({
  subagent_type: "shell",
  model: "fast",
  description: "Migrate FDK 9.x to FDK 10.x with Node 24",
  prompt: `Migrate from FDK 9.x (Node 18) to FDK 10.x (Node 24).

CONTEXT:
- User has FDK 9.x installed with Node 18
- Wants to upgrade to FDK 10.x with Node 24
- Must preserve Node 18 for legacy projects
- Must ensure zero downtime

DETECTION PHASE:
1. Check current FDK version:
   fdk version

2. Check current Node version:
   node --version

3. Check if nvm is installed:
   command -v nvm || echo "nvm not found"

4. List all installed Node versions:
   nvm list (if nvm exists)

5. Check FDK installation method:
   which fdk
   npm list -g @freshworks/fdk

PREPARATION PHASE:
6. If nvm not installed:
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   export NVM_DIR="$HOME/.nvm"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

7. Verify nvm installation:
   nvm --version

NODE 24 INSTALLATION:
8. Install Node 24 (keep Node 18):
   nvm install 24

9. Create nvm alias for FDK:
   nvm alias fdk 24

10. Verify Node 24 installation:
    nvm use 24
    node --version

FDK UPGRADE:
11. Switch to Node 24:
    nvm use 24

12. Uninstall FDK 9.x:
    npm uninstall @freshworks/fdk -g

13. Install FDK 10.x:
    npm install https://cdn.freshdev.io/fdk/latest-v24.tgz -g

14. Verify FDK installation:
    fdk version

SHELL CONFIGURATION:
15. Add to ~/.zshrc or ~/.bashrc:
    echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
    echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.zshrc
    echo 'nvm use fdk > /dev/null 2>&1' >> ~/.zshrc

16. Source shell config:
    source ~/.zshrc

VERIFICATION:
17. Test FDK commands:
    fdk version
    fdk validate --help

18. Verify Node 18 still available:
    nvm use 18
    node --version
    nvm use fdk

MIGRATION REPORT:
Print summary:
Old setup: FDK 9.x on Node 18
New setup: FDK 10.x on Node 24
Node 18 preserved: nvm use 18
Default: Node 24 (FDK 10.x)

COMMANDS TO SWITCH:
- Use FDK 10.x (Node 24): nvm use fdk
- Use legacy Node 18: nvm use 18

ERROR HANDLING:
- If nvm install fails: Provide manual installation URL
- If FDK install fails: Check npm permissions, retry with --force
- If Node 24 install fails: Check disk space, network connection
`
})
```

### Expected Output

```
Detected: FDK 9.8.2 on Node 18.20.0
nvm installed: v0.40.1
Node 24 installed: v24.11.0
nvm alias 'fdk' set to 24.11.0
FDK 9.x uninstalled
FDK 10.11.0 installed
Shell configured (~/.zshrc)

Migration Complete!

Old: FDK 9.8.2 + Node 18.20.0
New: FDK 10.11.0 + Node 24.11.0

Node 18 still available: nvm use 18
Default: Node 24 (FDK 10.x)
```

---

## Scenario 2: Existing Node Installation

### Context

User has:
- System Node.js (20.x or 22.x) installed via Homebrew/apt/direct installer
- Not using nvm
- Wants to add FDK without breaking existing Node setup

### Strategy

Install nvm alongside system Node, use nvm only for FDK, keep system Node as default.

### Subagent Prompt

```javascript
Task({
  subagent_type: "shell",
  model: "fast",
  description: "Install FDK with nvm alongside system Node",
  prompt: `Install FDK 10.x + Node 24 via nvm on system with existing Node installation.

CONTEXT:
- User has system Node (not via nvm)
- Wants to add FDK without breaking existing setup
- System Node should remain default for other projects

DETECTION:
1. Check existing Node:
   which node
   node --version

2. Check if via nvm:
   echo $NVM_DIR
   nvm --version 2>/dev/null || echo "nvm not found"

3. Check Node installation method:
   if [[ $(which node) == *"nvm"* ]]; then
     echo "Node via nvm"
   elif [[ $(which node) == *"homebrew"* ]] || [[ $(which node) == *"/usr/local"* ]]; then
     echo "Node via Homebrew"
   elif [[ $(which node) == *"/usr/bin"* ]]; then
     echo "Node via system package manager"
   else
     echo "Node via direct installer"
   fi

NVM INSTALLATION (Don't touch system Node):
4. Install nvm:
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

5. Source nvm in current shell:
   export NVM_DIR="$HOME/.nvm"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

6. Verify nvm:
   nvm --version

NODE 24 INSTALLATION:
7. Install Node 24 via nvm:
   nvm install 24

8. Create FDK alias:
   nvm alias fdk 24

9. Verify Node 24:
   nvm use fdk
   node --version

PATH PRIORITY CONFIGURATION:
10. Configure shell to use system Node by default:
    cat >> ~/.zshrc << 'EOF'

# nvm setup (for FDK only)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Alias to switch to FDK environment
alias fdk-env='nvm use fdk && echo "FDK environment (Node 24)"'

# Keep system Node as default (don't auto-switch)
# Use 'fdk-env' command to switch to FDK Node 24
EOF

11. Source shell config:
    source ~/.zshrc

FDK INSTALLATION:
12. Switch to Node 24:
    nvm use fdk

13. Install FDK:
    npm install https://cdn.freshdev.io/fdk/latest-v24.tgz -g

14. Verify FDK:
    fdk version

VERIFICATION:
15. Test isolation:
    # System Node (default)
    which node
    node --version

    # FDK Node 24
    fdk-env
    which node
    node --version
    fdk version

SETUP REPORT:
Print summary:
System Node preserved: [system node version]
nvm installed
Node 24 installed via nvm
FDK 10.x installed on Node 24
No conflicts

USAGE:
- Default: System Node ([version])
- FDK commands: Use 'fdk-env' first
  $ fdk-env
  $ fdk validate
  $ fdk run

BENEFITS:
- System Node untouched
- FDK isolated in nvm
- No PATH conflicts
- Easy to remove (just delete ~/.nvm)

ERROR HANDLING:
- If nvm conflicts with system Node: Check $PATH order
- If FDK not found: Run 'fdk-env' first
- If npm permission issues: Use nvm Node, not system Node
`
})
```

---

## Scenario 3: Modernize Older App to Platform 3.0

### Context

User has:
- An older Freshworks app (pre-3.0 patterns, stale manifest, legacy event names)
- FDK 10.x already installed with Node 24
- Needs to modernize the app to follow current Platform 3.0 conventions

### Goals

- Migrate manifest to Platform 3.0 module structure
- Replace deprecated event handlers with 3.0 equivalents
- Update `engines` block to current Node 24 / FDK 10.x
- Validate the modernized app with `fdk validate`

### Subagent Prompt

```javascript
Task({
  subagent_type: "shell",
  model: "fast",
  description: "Modernize app to Platform 3.0 conventions",
  prompt: `Modernize an older Freshworks app to Platform 3.0.

CONTEXT:
- User has an app with outdated patterns
- FDK 10.x + Node 24 already installed
- App must use Platform 3.0 manifest, events, and conventions

DETECTION PHASE:
1. Check current FDK:
   fdk version

2. Verify Node 24:
   node --version

3. Read current manifest:
   cat manifest.json

4. Identify issues:
   - Missing "platform-version": "3.0"
   - Missing "modules" structure (common, product-specific)
   - Old "engines" block (Node <24, FDK <10)
   - Deprecated event names or patterns

MANIFEST MODERNIZATION:
5. Ensure manifest has Platform 3.0 structure:
   - Top-level "platform-version": "3.0"
   - "modules" object with "common" and product modules
   - Events under the correct module (product events under product module, lifecycle under common)
   - "engines": { "node": "24.11.0", "fdk": "10.0.1" }

6. Example 3.0 manifest structure:
   {
     "platform-version": "3.0",
     "app": {},
     "modules": {
       "common": {
         "events": {
           "onAppInstall": { "handler": "onAppInstallHandler" },
           "onAppUninstall": { "handler": "onAppUninstallHandler" }
         },
         "requests": {},
         "functions": {}
       },
       "support_ticket": {
         "location": {
           "ticket_sidebar": {
             "url": "index.html",
             "icon": "styles/images/icon.svg"
           }
         },
         "events": {
           "onTicketCreate": { "handler": "onTicketCreateHandler" }
         }
       }
     },
     "engines": {
       "node": "24.11.0",
       "fdk": "10.0.1"
     }
   }

SERVER CODE MODERNIZATION:
7. Ensure server/server.js uses 3.0 patterns:
   - exports = { handlerName: async function(args) { ... } }
   - All handlers call renderData() on completion
   - Event handlers receive args with args.data context
   - SMI functions return renderData(null, result) or renderData(error, null)

8. Check for deprecated patterns:
   - No Platform 2.x app.initialized() in server code
   - No direct HTTP from server (use request templates in config/requests.json)
   - No global state across handler invocations

VALIDATION:
9. Run validation:
   fdk validate

10. Fix any reported issues

11. Test locally:
    fdk run

MODERNIZATION REPORT:
Print summary:
Manifest: Updated to Platform 3.0
Modules: [list modules]
Events: [list events]
Engines: Node 24.11.0, FDK 10.0.1
Validation: passed / failed

REMAINING STEPS:
- Test all event handlers locally
- Verify request templates work
- Run fdk validate before publishing

ERROR HANDLING:
- If manifest has unknown keys: Remove or migrate them
- If events are in wrong module: Move to correct product module
- If fdk validate fails: Fix reported issues
- If server code uses deprecated APIs: Rewrite to 3.0 patterns
`
})
```

### Expected Output

```
Detected: FDK 10.11.0 on Node 24.11.0

Modernization:
  manifest.json → Platform 3.0 module structure
  engines → Node 24.11.0, FDK 10.0.1
  Events moved to correct modules
  Server handlers updated to 3.0 patterns

Validation: fdk validate passed

App modernized to Platform 3.0!
```

---

## Scenario 4: Troubleshooting Broken FDK

### Context

FDK installed but not working:
- `fdk: command not found`
- Permission errors
- Wrong version
- Multiple conflicting installations

**CRITICAL:** For `command not found` errors, ALWAYS load `references/error-command-not-found.md` first for detailed diagnosis and Node version alignment fixes.

### Subagent Prompt

```javascript
Task({
  subagent_type: "shell",
  model: "fast",
  description: "Diagnose and fix broken FDK",
  prompt: `Diagnose and repair broken FDK installation.

CONTEXT:
- FDK installed but not working
- Common issues: PATH, permissions, multiple installations
- Need systematic diagnosis and repair

DIAGNOSTIC PHASE:

1. Check if FDK binary exists:
   which fdk
   if [ $? -eq 0 ]; then
     echo "FDK binary found: $(which fdk)"
     ls -la $(which fdk)
   else
     echo "✗ FDK binary not found"
   fi

2. Check Node.js:
   which node
   node --version
   npm --version

3. Check npm global directory:
   npm config get prefix
   NPM_PREFIX=$(npm config get prefix)
   echo "npm global prefix: $NPM_PREFIX"
   ls -la "$NPM_PREFIX/bin/fdk" 2>/dev/null || echo "FDK not in npm global bin"

4. Check PATH:
   echo "PATH: $PATH"
   echo "$PATH" | tr ':' '\n' | grep -E "(nvm|npm|node)"

5. Check for multiple FDK installations:
   echo "Searching for FDK installations..."
   find /usr/local -name fdk -type f 2>/dev/null
   find ~/.nvm -name fdk -type f 2>/dev/null
   find /opt/homebrew -name fdk -type f 2>/dev/null
   find ~/. -name fdk -type f 2>/dev/null | grep -v ".npm"

6. Check npm global packages:
   npm list -g @freshworks/fdk 2>/dev/null || echo "FDK not in npm global packages"

7. Check nvm:
   command -v nvm && nvm --version || echo "nvm not found"
   if command -v nvm >/dev/null; then
     nvm current
     nvm list
   fi

DIAGNOSIS SUMMARY:
echo "=== DIAGNOSIS SUMMARY ==="
echo "Node: $(node --version 2>/dev/null || echo 'not found')"
echo "npm: $(npm --version 2>/dev/null || echo 'not found')"
echo "FDK: $(fdk version 2>/dev/null || echo 'not found')"
echo "nvm: $(nvm --version 2>/dev/null || echo 'not found')"
echo "========================="

COMMON FIXES:

FIX A: Permission issues
if [ -d "$NPM_PREFIX" ]; then
  echo "Fixing npm permissions..."
  sudo chown -R $(whoami) "$NPM_PREFIX"
  echo "Permissions fixed"
fi

FIX B: PATH issues
if ! echo "$PATH" | grep -q "$(npm config get prefix)/bin"; then
  echo "Adding npm global bin to PATH..."
  echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.zshrc
  source ~/.zshrc
  echo "PATH updated"
fi

FIX C: Multiple conflicting installations
echo "Removing all FDK installations..."
npm uninstall @freshworks/fdk -g 2>/dev/null
brew uninstall fdk 2>/dev/null
sudo rm -f /usr/local/bin/fdk 2>/dev/null
echo "Old installations removed"

FIX D: Wrong Node version
if command -v nvm >/dev/null; then
  echo "Switching to Node 24..."
  nvm install 24
  nvm use 24
  echo "Node 24 activated"
fi

FIX E: Corrupted npm cache
echo "Cleaning npm cache..."
npm cache clean --force
echo "npm cache cleaned"

CLEAN REINSTALL:

echo "Performing clean FDK installation..."

1. Ensure Node 24:
   if command -v nvm >/dev/null; then
     nvm use 24 || nvm install 24
   fi
   node --version

2. Install FDK:
   npm install https://cdn.freshdev.io/fdk/latest-v24.tgz -g

3. Verify installation:
   which fdk
   fdk version

VERIFICATION:

echo "=== VERIFICATION ==="

1. Test FDK command:
   fdk version && echo "PASS: fdk version works" || echo "FAIL: fdk version failed"

2. Test FDK help:
   fdk validate --help && echo "PASS: fdk validate --help works" || echo "FAIL: fdk validate --help failed"

3. Test in new shell:
   bash -c 'fdk version' && echo "PASS: fdk works in new shell" || echo "FAIL: fdk fails in new shell"

4. Create test app (optional):
   mkdir -p /tmp/fdk-test
   cd /tmp/fdk-test
   fdk create --product freshdesk --template your_first_app
   cd your_first_app
   fdk validate && echo "PASS: Test app validates" || echo "FAIL: Test app validation failed"
   cd -
   rm -rf /tmp/fdk-test

TROUBLESHOOTING REPORT:

echo "=== TROUBLESHOOTING COMPLETE ==="
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "FDK: $(fdk version)"
echo "FDK path: $(which fdk)"
echo "================================"

MANUAL STEPS IF STILL BROKEN:

If FDK still not working:

1. Check shell config:
   cat ~/.zshrc | grep -E "(nvm|npm|node|PATH)"

2. Source shell config:
   source ~/.zshrc

3. Restart terminal

4. If using nvm, ensure it's loaded:
   export NVM_DIR="$HOME/.nvm"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

5. Check for shell-specific issues:
   echo $SHELL
   # If bash: check ~/.bashrc
   # If zsh: check ~/.zshrc

6. Last resort - complete reinstall:
   # Remove everything
   rm -rf ~/.nvm
   rm -rf ~/.npm
   npm uninstall @freshworks/fdk -g

   # Reinstall from scratch
   # Follow Scenario 1 (fresh install)

ERROR HANDLING:
- If permission denied: Use sudo for system directories
- If npm not found: Install Node.js first
- If nvm issues: Reinstall nvm
- If PATH not updating: Check shell config syntax
`
})
```

---


---

## Scenario 5: Install Specific FDK Version

### Context

User needs specific FDK version for:
- Team consistency
- Compatibility with existing apps
- Testing specific version

### Subagent Prompt

```javascript
Task({
  subagent_type: "shell",
  model: "fast",
  description: "Install specific FDK version",
  prompt: `Install FDK version <TARGET_VERSION> with Node 24.

CONTEXT:
- User needs specific FDK version (not latest)
- For team consistency or compatibility
- Node 24 required

STEPS:
1. Parse target version from user request

2. Ensure Node 24 active:
   nvm use fdk || nvm use 24

3. Check if version already installed:
   current=$(fdk version 2>/dev/null)
   if [ "$current" = "<TARGET_VERSION>" ]; then
     echo "FDK <TARGET_VERSION> already installed"
     exit 0
   fi

4. Uninstall current FDK (if exists):
   npm uninstall -g @freshworks/fdk 2>/dev/null || true

5. Install specific version (verify tarball first; semver without leading `v`):
   FDK_URL="https://cdn.freshdev.io/fdk/v<TARGET_VERSION>.tgz"
   HTTP=$(curl -sS -o /dev/null -w "%{http_code}" -L -I "$FDK_URL" || echo "000")
   [ "$HTTP" = "200" ] || exit 1
   npm install -g "$FDK_URL"

6. Verify installation:
   fdk version

VERIFICATION:
- fdk version should output <TARGET_VERSION>
- node --version should output 24.x.x
- fdk validate --help should work

OUTPUT FORMAT:
Node 24 active: v24.x.x
FDK <TARGET_VERSION> installed
Verification successful

FDK <TARGET_VERSION> ready!

ERROR HANDLING:
- If version not found: Check `https://cdn.freshdev.io/fdk/v<semver>.tgz` (HTTP 200) and valid semver
- If Node not 24: Switch to Node 24 first
- If install fails: Check npm permissions
`
})
```

---

## Scenario 6: Node PATH Mismatch

### Context

FDK installed but using wrong Node version:
- FDK installed on Node 24
- System using Node 20 or 22
- PATH pointing to wrong Node

### Subagent Prompt

```javascript
Task({
  subagent_type: "shell",
  model: "fast",
  description: "Fix Node PATH mismatch",
  prompt: `Fix Node PATH mismatch - ensure FDK uses Node 24.

CONTEXT:
- FDK installed but not working correctly
- Wrong Node version in PATH
- Need to point to Node 24

DIAGNOSIS:
1. Check current Node:
   which node
   node --version

2. Check FDK:
   which fdk
   fdk version

3. Check nvm:
   nvm current
   nvm list

4. Check if FDK installed on Node 24:
   ls ~/.nvm/versions/node/v24.*/bin/fdk

5. Check PATH:
   echo $PATH | tr ':' '\n' | grep node

ANALYSIS:
- If Node is not 24.x: PATH mismatch
- If FDK exists but not in PATH: Configuration issue
- If multiple Node versions in PATH: Priority issue

FIX:
1. Switch to Node 24:
   nvm use fdk || nvm use 24

2. Update shell configuration:
   cat >> ~/.zshrc << 'SHELL_EOF'

# Ensure Node 24 for FDK
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use fdk > /dev/null 2>&1
SHELL_EOF

3. Source shell:
   source ~/.zshrc

4. Verify fix:
   node --version (should be 24.x.x)
   fdk version (should work)

VERIFICATION:
- Open new terminal and check: node --version
- Check FDK works: fdk validate --help

OUTPUT FORMAT:
Node PATH fixed: v24.x.x
FDK now accessible
Shell configured

PATH mismatch resolved!

Current setup:
- Node: v24.x.x
- FDK: 10.x.x
- nvm alias: fdk → 24

ERROR HANDLING:
- If nvm not found: Install nvm first
- If Node 24 not installed: Install Node 24
- If shell config fails: Manually edit ~/.zshrc
`
})
```

---

## Scenario 7: Multiple Node Versions (Team Development)

### Context

Developer works on multiple projects:
- Project A: Node 20 (non-Freshworks)
- Project B: Node 24 (Freshworks apps)
- Need easy switching

### Subagent Prompt

```javascript
Task({
  subagent_type: "shell",
  model: "fast",
  description: "Setup multiple Node versions with FDK",
  prompt: `Configure multiple Node versions for multi-project development.

CONTEXT:
- Developer works on multiple projects
- Different projects need different Node versions
- Freshworks apps need Node 24 + FDK
- Other projects use Node 20, 22, etc.

STRATEGY:
Use nvm with project-specific .nvmrc files

STEPS:
1. Install all needed Node versions:
   nvm install 20
   nvm install 22
   nvm install 24

2. Create nvm aliases:
   nvm alias default 20  # Default for non-Freshworks projects
   nvm alias fdk 24      # For Freshworks development

3. Install FDK on Node 24:
   nvm use 24
   npm install https://cdn.freshdev.io/fdk/latest-v24.tgz -g

4. Create .nvmrc files for projects:

   # Freshworks projects
   cd ~/projects/freshworks-app
   echo "24" > .nvmrc

   # Other projects
   cd ~/projects/other-app
   echo "20" > .nvmrc

5. Configure auto-switching:
   Add to ~/.zshrc:

   # Auto-switch Node version based on .nvmrc
   autoload -U add-zsh-hook
   load-nvmrc() {
     if [[ -f .nvmrc && -r .nvmrc ]]; then
       nvm use
     elif [[ $(nvm version) != $(nvm version default) ]]; then
       nvm use default
     fi
   }
   add-zsh-hook chpwd load-nvmrc
   load-nvmrc

6. Source shell:
   source ~/.zshrc

USAGE:
- cd ~/projects/freshworks-app → Auto-switches to Node 24
- cd ~/projects/other-app → Auto-switches to Node 20
- Manual switch: nvm use fdk (Node 24)
- Manual switch: nvm use 20 (Node 20)

VERIFICATION:
- cd freshworks-app && node --version (24.x.x)
- cd other-app && node --version (20.x.x)
- cd freshworks-app && fdk version (10.x.x)

OUTPUT FORMAT:
Node 20 installed
Node 22 installed
Node 24 installed
nvm aliases configured
FDK 10.x installed on Node 24
.nvmrc files created
Auto-switching configured

Multiple Node Setup Complete!

Node versions:
  v20.x.x (default)
  v22.x.x
  v24.x.x (fdk)

FDK: 10.x.x (Node 24 only)

Auto-switching enabled:
- cd to project → auto-switches to .nvmrc version
- Freshworks projects → Node 24
- Other projects → Node 20/22

ERROR HANDLING:
- If nvm install fails: Check disk space
- If auto-switching not working: Check zsh hooks
- If .nvmrc not recognized: Verify nvm installation
`
})
```

---

## Testing Matrix

| Scenario | macOS | Windows | Linux |
|----------|-------|---------|-------|
| 1. Legacy Migration (FDK 9.x→10) | Supported | Supported | Supported |
| 2. Existing Node | Supported | Supported | Supported |
| 3. Modernize to 3.0 | Supported | Supported | Supported |
| 4. Troubleshooting | Supported | Supported | Supported |
| 5. Specific Version | Supported | Supported | Supported |
| 6. Node PATH Mismatch | Supported | Supported | Supported |
| 7. Multiple Node Versions | Supported | Supported | Supported |

---

## Quick Reference

| Need | Use Scenario |
|------|--------------|
| Upgrade from FDK 9.x to 10 | Scenario 1 |
| Already have Node installed | Scenario 2 |
| Modernize older app to Platform 3.0 | Scenario 3 |
| FDK not working | Scenario 4 |
| Install specific FDK version | Scenario 5 |
| Node PATH issues | Scenario 6 |
| Multiple projects, different Node versions | Scenario 7 |
