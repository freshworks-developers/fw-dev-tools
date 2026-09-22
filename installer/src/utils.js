import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SKILLS_SRC = join(REPO_ROOT, 'skills');
export const SPECS_SRC = join(REPO_ROOT, 'specs');
export const SCRIPTS_SRC = join(REPO_ROOT, 'skills', 'shared', 'scripts');
export const META_TEMPLATE = join(REPO_ROOT, 'skills', 'shared', '.meta.template.json');
export const FW_DEV_TOOLS_DIR = process.env.FW_DEV_TOOLS_HOME
  ? process.env.FW_DEV_TOOLS_HOME
  : join(homedir(), '.fw-dev-tools');
export const INSTALL_JSON = join(FW_DEV_TOOLS_DIR, '.meta.json');

const DEFAULT_UPDATE_CHECK = {
  lastChecked: null,
  lastNudged: null,
  latestVersion: null,
  updateAvailable: false,
};

async function readUpdateCheckDefaults() {
  try {
    const template = JSON.parse(await readFile(META_TEMPLATE, 'utf8'));
    if (template.update_check && typeof template.update_check === 'object') {
      return { ...DEFAULT_UPDATE_CHECK, ...template.update_check };
    }
  } catch {
    // fall through to hardcoded defaults
  }
  return { ...DEFAULT_UPDATE_CHECK };
}

const _pkg = JSON.parse(await readFile(join(REPO_ROOT, 'package.json'), 'utf8'));
export const VERSION = _pkg.version;

/** Skill directory names installed by fw-dev-tools (current + legacy). */
export const FW_SKILLS = [
  'fw-setup',
  'fw-app-dev',
  'fw-build-your-mcp-app',
  'fw-review',
  'fw-publish',
];

export const FW_SKILLS_LEGACY = ['fw-marketplace-app-dev', 'fw-ai-actions-app'];

/** Tier 2 orchestration specs copied to ~/.fw-dev-tools/specs/ on install. */
export const SHIPPED_SPECS = [
  'agent-behaviour.md',
  'fw-session.schema.json',
  'ecosystem-map.md',
  'platform-knowledge-map.md',
  'preflight.mdc',
];

export const BRAIN_SPEC_SRC = join(SPECS_SRC, 'agent-behaviour.md');
export const BRAIN_SPEC_INSTALLER = join(REPO_ROOT, 'installer', 'src', 'specs', 'agent-behaviour.md');
const SPEC_SOURCE_FALLBACKS = {
  'agent-behaviour.md': BRAIN_SPEC_INSTALLER,
  'fw-session.schema.json': join(REPO_ROOT, 'skills', 'shared', 'references', 'fw-session-schema.json'),
  'ecosystem-map.md': join(REPO_ROOT, 'skills', 'shared', 'references', 'ecosystem-map.md'),
  'preflight.mdc': join(REPO_ROOT, 'skills', 'shared', 'rules', 'preflight.mdc'),
};

function resolveSpecSource(file) {
  const primary = join(SPECS_SRC, file);
  if (existsSync(primary)) return primary;
  const fallback = SPEC_SOURCE_FALLBACKS[file];
  if (fallback && existsSync(fallback)) return fallback;
  throw new Error(`Missing shipped spec source: ${file}`);
}

/**
 * Remove prior fw-dev-tools skill trees under a skills root (Cursor/Codex copy targets).
 */
export async function removeFwSkillDirs(skillsDir, { includeLegacy = true } = {}) {
  const names = includeLegacy ? [...FW_SKILLS, ...FW_SKILLS_LEGACY] : [...FW_SKILLS];
  let removed = 0;
  for (const skill of names) {
    const p = join(skillsDir, skill);
    if (existsSync(p)) {
      await rm(p, { recursive: true, force: true });
      removed++;
    }
  }
  return removed;
}

/** Claude Code plugin cache for a marketplace (e.g. freshworks-dev-tools). */
export function claudePluginCacheDir(marketplaceName = 'freshworks-dev-tools') {
  return join(homedir(), '.claude', 'plugins', 'cache', marketplaceName);
}

/** Remove stale Claude plugin cache so reinstall does not leave old version dirs (e.g. 1.0.0). */
export async function removeClaudePluginCache(
  cacheRoot = claudePluginCacheDir('freshworks-dev-tools'),
) {
  if (!existsSync(cacheRoot)) return false;
  await rm(cacheRoot, { recursive: true, force: true });
  return true;
}

/**
 * Copy installable skill trees from skills/ into targetDir.
 * Only FW_SKILLS (+ legacy names) — not skills/shared/ (scripts go via copyScripts()).
 */
export async function copySkills(targetDir) {
  await mkdir(targetDir, { recursive: true });
  const names = [...FW_SKILLS, ...FW_SKILLS_LEGACY];
  for (const skill of names) {
    const src = join(SKILLS_SRC, skill);
    if (!existsSync(src)) continue;
    await cp(src, join(targetDir, skill), { recursive: true });
  }
}

/**
 * Write the install state marker file.
 */
export async function copyScripts() {
  const dest = join(FW_DEV_TOOLS_DIR, 'scripts');
  await mkdir(dest, { recursive: true });
  await cp(SCRIPTS_SRC, dest, { recursive: true });
}

/**
 * Copy Tier 2 spec artifacts to ~/.fw-dev-tools/specs/ for IDE agents.
 * Also syncs agent-behaviour.md into installer/src/specs/ for packaging when
 * running from the repository checkout.
 */
export async function copySpecs(dest = join(FW_DEV_TOOLS_DIR, 'specs'), { syncInstaller = true } = {}) {
  await mkdir(dest, { recursive: true });
  for (const file of SHIPPED_SPECS) {
    const src = resolveSpecSource(file);
    await cp(src, join(dest, file));
  }
  if (syncInstaller && existsSync(BRAIN_SPEC_SRC)) {
    await mkdir(dirname(BRAIN_SPEC_INSTALLER), { recursive: true });
    await cp(BRAIN_SPEC_SRC, BRAIN_SPEC_INSTALLER);
  }
}

/** Read Tier 2 brain markdown for always-loaded IDE installs. */
export async function readBrainSpecContent() {
  return readFile(resolveSpecSource('agent-behaviour.md'), 'utf8');
}

export async function writeInstallState({ client, method = 'npx' }) {
  await mkdir(dirname(INSTALL_JSON), { recursive: true });
  const existing = existsSync(INSTALL_JSON)
    ? JSON.parse(await readFile(INSTALL_JSON, 'utf8'))
    : {};
  let existingClients;
  if (Array.isArray(existing.clients)) {
    existingClients = existing.clients;
  } else {
    existingClients = existing.client ? [existing.client] : [];
  }
  const clients = existingClients.includes(client) ? existingClients : [...existingClients, client];
  const state = {
    ...existing,
    version: VERSION,
    method,
    client,
    clients,
    installedAt: existing.installedAt ?? new Date().toISOString(),
    update_check: existing.update_check ?? await readUpdateCheckDefaults(),
  };
  // Atomic write: avoids macOS TCC/provenance EPERM on files created by npx
  const tmp = INSTALL_JSON + '.tmp';
  await writeFile(tmp, JSON.stringify(state, null, 2) + '\n', 'utf8');
  await rename(tmp, INSTALL_JSON);
  return state;
}

/**
 * Read the install state marker file. Returns null if absent.
 */
export async function readInstallState() {
  if (!existsSync(INSTALL_JSON)) return null;
  try {
    return JSON.parse(await readFile(INSTALL_JSON, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Prompt the user for input. Returns empty string if --yes or non-interactive.
 */
export async function prompt(question, { yes = false } = {}) {
  if (yes) return '';
  if (process.env.FW_TEST_PROMPT_ANSWER !== undefined) {
    return process.env.FW_TEST_PROMPT_ANSWER;
  }
  if (!process.stdin.isTTY) return '';
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/** Detect which clients are likely present on this machine. */
export async function detectClients() {
  const clients = [];
  if (existsSync(join(homedir(), '.cursor'))) clients.push('cursor');
  if (existsSync(join(homedir(), '.claude'))) clients.push('claude');
  if (existsSync(join(homedir(), '.codex'))) clients.push('codex');
  return clients;
}
