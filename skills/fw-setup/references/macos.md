# FDK Setup — macOS

## Prerequisites

- **nvm (Node Version Manager)** — Recommended for managing Node.js versions
- **Node.js v24.0.0 or later** — Installed via nvm
- **Homebrew** (optional) — [Install](https://brew.sh/) if not present: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

## Step 1: Install nvm

If nvm is not already installed:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Load nvm into current shell
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Verify installation
nvm --version
```

The install script automatically adds nvm to your shell profile (`~/.zshrc`, `~/.bash_profile`, or `~/.bashrc`).

## Step 2: Install Node.js 24

```bash
# Install latest Node.js 24.x
nvm install 24

# Create alias for FDK
nvm alias fdk 24

# Set as current version
nvm use 24

# Verify
node --version  # Should show v24.x.x
```

## Step 3: Configure Shell for FDK

Add to `~/.zshrc` (or `~/.bash_profile` for bash):

```bash
# FDK uses Node.js 24
export FDK_NODE_VERSION=24
alias fdk-env='nvm use $FDK_NODE_VERSION'

# Auto-switch to Node 24 when entering FDK projects (optional)
# Add .nvmrc with "24" to your FDK project directories
```

Apply changes:
```bash
source ~/.zshrc
```

## Step 4: Install FDK

### Option A: Install via npm (Recommended)

```bash
# Ensure Node 24 is active
nvm use 24

# Install FDK globally
npm install https://cdn.freshdev.io/fdk/latest-v24.tgz -g

# Verify
fdk version
```

### Option B: Install via Homebrew

**Note:** Homebrew FDK may bundle its own Node.js. Using npm with nvm gives better version control.

1. **Tap the Freshworks CLI repository:**
   ```bash
   brew tap freshworks-developers/homebrew-tap
   ```

2. **Install FDK:**
   ```bash
   brew install fdk
   ```

3. **Add path to shell config:**
   ```bash
   echo 'source "$(brew --repository freshworks-developers/homebrew-tap)/path.bash.inc"' >> ~/.zshrc
   ```

4. **Apply changes:**
   ```bash
   source ~/.zshrc
   ```

5. **Verify:**
   ```bash
   fdk version
   ```

## Step 5: Verify Complete Setup

```bash
# Check all components
nvm current          # Should show v24.x.x
node --version       # Should show v24.x.x
npm --version        # Should show 9.x or 10.x
fdk version          # Should show 10.0.0 or later

# Test FDK
fdk --help
```

## Managing Multiple Node Versions

With nvm, you can keep multiple Node versions and switch as needed:

```bash
# List installed versions
nvm list

# Install other versions
nvm install 20
nvm install 22

# Switch between versions
nvm use fdk         # Use Node 24 for FDK
nvm use 20          # Use Node 20 for other projects
nvm use default     # Use system default

# Set default version (optional)
nvm alias default 20  # Node 20 as default
nvm alias fdk 24      # Node 24 for FDK (already set)
```

## Auto-Switching with .nvmrc

Create `.nvmrc` in your FDK project directories:

```bash
echo "24" > .nvmrc
```

Then nvm will auto-switch when you `cd` into the directory (requires shell integration).

## Troubleshooting

### `fdk: command not found`

1. Check Node version: `node --version` (should be 24.x)
2. Switch to Node 24: `nvm use 24`
3. Reinstall FDK: `npm install https://cdn.freshdev.io/fdk/latest-v24.tgz -g`
4. Check npm global path: `npm config get prefix`
5. Ensure PATH includes npm global bin: `echo $PATH | grep npm`

### `nvm: command not found`

1. Check if nvm installed: `ls ~/.nvm`
2. Load nvm: `source ~/.nvm/nvm.sh`
3. Add to shell config if missing:
   ```bash
   export NVM_DIR="$HOME/.nvm"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
   ```

### FDK installed but wrong Node version

```bash
nvm use 24
fdk version  # Should work now
```

## Uninstall

```bash
# Uninstall FDK only (keep Node.js and nvm)
npm uninstall fdk -g

# Or if installed via Homebrew
brew uninstall fdk
brew untap freshworks-developers/homebrew-tap

# To remove Node 24 (optional)
nvm uninstall 24
nvm unalias fdk

# To remove nvm completely (optional)
rm -rf ~/.nvm
# Remove nvm lines from ~/.zshrc or ~/.bash_profile
```
