/**
 * Installer lifecycle — install, status, update, uninstall, and migration paths.
 *
 * Runs the real CLI in isolated $HOME temp dirs via subprocess (no pollution of ~/.fw-dev-tools).
 * Claude plugin tests require `claude` on PATH. Install uses a local marketplace
 * copy under ~/.fw-dev-tools/ (skills + .claude-plugin) and writes ~/.claude/CLAUDE.md.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, rm, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI = join(REPO_ROOT, 'installer', 'bin', 'cli.js');
const PKG_VERSION = JSON.parse(await readFile(join(REPO_ROOT, 'package.json'), 'utf8')).version;

const SKILLS = ['fw-setup', 'fw-app-dev', 'fw-build-your-mcp-app', 'fw-review', 'fw-publish'];
const SCRIPT_NAMES = ['meta-init.sh', 'meta-update.sh', 'meta-feedback.sh', 'meta-delete.sh', 'check-update.sh'];

/** Test-only Cursor/Codex roots (no leading dot — safe in restricted sandboxes). */
function devToolsHome(home) { return join(home, '.fw-dev-tools'); }
function cursorHome(home) { return join(home, 'cursor-test'); }
function codexHome(home) { return join(home, 'codex-test'); }

function cliTestEnv(home, extra = {}) {
  return {
    ...process.env,
    HOME: home,
    FW_DEV_TOOLS_HOME: devToolsHome(home),
    FW_TEST_CURSOR_ROOT: cursorHome(home),
    FW_TEST_CODEX_ROOT: codexHome(home),
    ...extra,
  };
}

let claudeCliAvailable = null;

async function isClaudeAvailable() {
  if (claudeCliAvailable !== null) return claudeCliAvailable;
  try {
    await execFileAsync('claude', ['--version'], { timeout: 15_000 });
    claudeCliAvailable = true;
  } catch {
    claudeCliAvailable = false;
  }
  return claudeCliAvailable;
}

function skipWithoutClaude(t) {
  if (!claudeCliAvailable) {
    t.skip('claude CLI not on PATH — install Claude Code to run plugin lifecycle tests');
    return true;
  }
  return false;
}

async function makeHome() {
  const home = join(tmpdir(), `fw-lifecycle-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(home, { recursive: true });
  return home;
}

async function runCli(home, args, { cwd = home, env = {} } = {}) {
  const { stdout, stderr } = await execFileAsync('node', [CLI, ...args], {
    env: cliTestEnv(home, env),
    cwd,
    timeout: 180_000,
  });
  return (stdout + stderr).trim();
}

async function readInstallState(home) {
  const p = join(devToolsHome(home), '.meta.json');
  if (!existsSync(p)) return null;
  return JSON.parse(await readFile(p, 'utf8'));
}

async function listClaudePlugins(home) {
  const { stdout, stderr } = await execFileAsync('claude', ['plugin', 'list'], {
    env: cliTestEnv(home),
    timeout: 60_000,
  });
  const out = stdout + stderr;
  if (/No plugins installed/i.test(out)) return [];

  const plugins = [];
  const lines = out.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const nameMatch = lines[i].match(/(fw-[\w-]+)@freshworks-dev-tools/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const versionMatch = lines[i + 1]?.match(/Version:\s*(\S+)/);
    plugins.push({ name, version: versionMatch?.[1] ?? null });
  }
  return plugins;
}

async function cleanup(home) {
  await rm(home, { recursive: true, force: true });
}

function skillFrontmatterVersion(skillMd) {
  const m = skillMd.match(/^version:\s*"?([^"\n]+)"?/m);
  return m?.[1] ?? null;
}

async function assertLocalClaudeMarketplace(home) {
  const skillPath = join(devToolsHome(home), 'skills', 'fw-app-dev', 'SKILL.md');
  const marketplacePath = join(devToolsHome(home), '.claude-plugin', 'marketplace.json');
  await access(skillPath);
  await access(marketplacePath);
  const skillVer = skillFrontmatterVersion(await readFile(skillPath, 'utf8'));
  const marketplace = JSON.parse(await readFile(marketplacePath, 'utf8'));
  assert.equal(skillVer, PKG_VERSION, 'local skills copy should match package version');
  assert.equal(marketplace.version, PKG_VERSION, 'local marketplace.json should match package version');
  for (const skill of SKILLS) {
    await access(join(devToolsHome(home), 'skills', skill, 'SKILL.md'));
  }
}

async function assertClaudeMdRouting(home, { present = true } = {}) {
  const claudeMd = join(home, '.claude', 'CLAUDE.md');
  if (!present) {
    if (!existsSync(claudeMd)) return;
    const content = await readFile(claudeMd, 'utf8');
    assert.ok(!content.includes('<!-- fw-dev-tools start -->'), 'CLAUDE.md routing block should be removed');
    return;
  }
  await access(claudeMd);
  const content = await readFile(claudeMd, 'utf8');
  assert.ok(content.includes('<!-- fw-dev-tools start -->'), 'CLAUDE.md missing fw-dev-tools start fence');
  assert.ok(content.includes('<!-- fw-dev-tools end -->'), 'CLAUDE.md missing fw-dev-tools end fence');
  assert.ok(content.includes('IDE skill paths'), 'CLAUDE.md should embed routing spec');
  assert.equal(
    (content.match(/<!-- fw-dev-tools start -->/g) ?? []).length,
    1,
    'CLAUDE.md should have exactly one fw-dev-tools block',
  );
}

test('Claude install copies all plugins, scripts, and writes install state', async (t) => {
  await isClaudeAvailable();
  if (skipWithoutClaude(t)) return;

  const home = await makeHome();
  try {
    const out = await runCli(home, ['install', '--tools', 'claude', '--yes']);
    for (const skill of SKILLS) {
      assert.match(out, new RegExp(`Installed ${skill}|✓ Installed ${skill}`), `stdout should confirm ${skill}`);
    }
    for (const script of SCRIPT_NAMES) {
      await access(join(devToolsHome(home), 'scripts', script));
    }
    const state = await readInstallState(home);
    assert.ok(state, '.meta.json should exist');
    assert.equal(state.version, PKG_VERSION);
    assert.equal(state.client, 'claude');
    assert.ok(state.installedAt, 'installedAt should be set');

    const plugins = await listClaudePlugins(home);
    assert.equal(plugins.length, 5, 'claude should have 5 fw-dev-tools plugins');
    for (const skill of SKILLS) {
      assert.ok(plugins.some(p => p.name === skill), `plugin ${skill} missing`);
    }
    await assertLocalClaudeMarketplace(home);
    await assertClaudeMdRouting(home);
  } finally {
    await cleanup(home);
  }
});

test('multi-client install accumulates clients array in .meta.json', async () => {
  const home = await makeHome();
  try {
    await runCli(home, ['install', '--tools', 'cursor', '--yes']);
    await runCli(home, ['install', '--tools', 'codex', '--yes']);
    const state = await readInstallState(home);
    assert.ok(Array.isArray(state.clients), 'clients should be an array');
    assert.ok(state.clients.includes('cursor'), 'clients should include cursor');
    assert.ok(state.clients.includes('codex'), 'clients should include codex');
  } finally {
    await cleanup(home);
  }
});

test('Codex install writes MCP config to ~/.codex/mcp.json regardless of cwd', async () => {
  const home = await makeHome();
  const unrelatedCwd = join(home, 'unrelated-cwd');
  try {
    await mkdir(unrelatedCwd, { recursive: true });

    await runCli(home, ['install', '--tools', 'codex', '--yes'], { cwd: unrelatedCwd });

    const mcpJson = join(codexHome(home), 'mcp.json');
    assert.equal(existsSync(mcpJson), true, 'expected ~/.codex/mcp.json to be created');
    assert.equal(existsSync(join(unrelatedCwd, '.mcp.json')), false, 'should not write MCP config to shell cwd');

    const config = JSON.parse(await readFile(mcpJson, 'utf8'));
    assert.ok(config.mcpServers?.['fw-dev-mcp']?.url, 'fw-dev-mcp entry should be merged');
    await access(join(codexHome(home), 'skills', 'fw-app-dev', 'SKILL.md'));
  } finally {
    await cleanup(home);
  }
});

test('status prints version and client after install', async () => {
  const home = await makeHome();
  try {
    await runCli(home, ['install', '--tools', 'cursor', '--yes']);
    const out = await runCli(home, ['status']);
    assert.match(out, new RegExp(PKG_VERSION.replace(/\./g, '\\.')));
    assert.match(out, /cursor/i);
    assert.doesNotMatch(out, /not installed/i);
  } finally {
    await cleanup(home);
  }
});

test('Claude install writes CLAUDE.md routing block preserving existing content', async (t) => {
  await isClaudeAvailable();
  if (skipWithoutClaude(t)) return;

  const home = await makeHome();
  try {
    await mkdir(join(home, '.claude'), { recursive: true });
    await writeFile(join(home, '.claude', 'CLAUDE.md'), '# user config\n', 'utf8');

    await runCli(home, ['install', '--tools', 'claude', '--yes']);

    const content = await readFile(join(home, '.claude', 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('# user config'), 'should preserve pre-existing CLAUDE.md content');
    await assertClaudeMdRouting(home);
    await assertLocalClaudeMarketplace(home);
  } finally {
    await cleanup(home);
  }
});

test('Claude install removes stale ~/.claude/skills copies', async (t) => {
  await isClaudeAvailable();
  if (skipWithoutClaude(t)) return;

  const home = await makeHome();
  try {
    const staleDir = join(home, '.claude', 'skills', 'fw-app-dev');
    await mkdir(staleDir, { recursive: true });
    await writeFile(join(staleDir, 'SKILL.md'), 'version: "1.1.1"\n# stale legacy copy\n', 'utf8');

    const out = await runCli(home, ['install', '--tools', 'claude', '--yes']);
    assert.equal(existsSync(staleDir), false, 'stale ~/.claude/skills/fw-app-dev should be removed');
    assert.match(out, /Removed \d+ stale fw-dev-tools skill/);
    assert.equal((await listClaudePlugins(home)).length, 5);
  } finally {
    await cleanup(home);
  }
});

test('second Claude install removes re-created stale ~/.claude/skills copies', async (t) => {
  await isClaudeAvailable();
  if (skipWithoutClaude(t)) return;

  const home = await makeHome();
  try {
    await runCli(home, ['install', '--tools', 'claude', '--yes']);
    const staleDir = join(home, '.claude', 'skills', 'fw-review');
    await mkdir(staleDir, { recursive: true });
    await writeFile(join(staleDir, 'SKILL.md'), 'version: "1.0.0"\n# stale again\n', 'utf8');

    await runCli(home, ['install', '--tools', 'claude', '--yes']);
    assert.equal(existsSync(staleDir), false, 're-created stale skill dir should be removed on reinstall');
  } finally {
    await cleanup(home);
  }
});

test('Claude install removes stale plugin cache versions', async (t) => {
  await isClaudeAvailable();
  if (skipWithoutClaude(t)) return;

  const home = await makeHome();
  try {
    const staleCache = join(home, '.claude', 'plugins', 'cache', 'freshworks-dev-tools', 'fw-review', '1.0.0');
    await mkdir(staleCache, { recursive: true });
    await writeFile(join(staleCache, 'SKILL.md'), 'version: "1.0.0"\n# stale cache\n', 'utf8');

    const out = await runCli(home, ['install', '--tools', 'claude', '--yes']);
    assert.equal(existsSync(staleCache), false, 'stale 1.0.0 plugin cache should be removed');
    assert.match(out, /Removed stale plugin cache/);
    assert.equal((await listClaudePlugins(home)).length, 5);
  } finally {
    await cleanup(home);
  }
});

test('second Claude install refreshes local marketplace skill copy', async (t) => {
  await isClaudeAvailable();
  if (skipWithoutClaude(t)) return;

  const home = await makeHome();
  try {
    await runCli(home, ['install', '--tools', 'claude', '--yes']);
    const skillPath = join(devToolsHome(home), 'skills', 'fw-app-dev', 'SKILL.md');
    await writeFile(skillPath, 'stale-local-marketplace-copy', 'utf8');

    await runCli(home, ['install', '--tools', 'claude', '--yes']);

    const content = await readFile(skillPath, 'utf8');
    assert.notEqual(content, 'stale-local-marketplace-copy');
    assert.equal(skillFrontmatterVersion(content), PKG_VERSION);
    await assertLocalClaudeMarketplace(home);
  } finally {
    await cleanup(home);
  }
});

test('second install does not duplicate plugins or change installedAt', async (t) => {
  await isClaudeAvailable();
  if (skipWithoutClaude(t)) return;

  const home = await makeHome();
  try {
    await runCli(home, ['install', '--tools', 'claude', '--yes']);
    const state1 = await readInstallState(home);
    const plugins1 = await listClaudePlugins(home);

    await runCli(home, ['install', '--tools', 'claude', '--yes']);
    const state2 = await readInstallState(home);
    const plugins2 = await listClaudePlugins(home);

    assert.equal(plugins2.length, 5);
    assert.equal(plugins1.length, plugins2.length);
    assert.equal(state2.installedAt, state1.installedAt, 'installedAt must not change on re-install');
    assert.equal(state2.version, PKG_VERSION);
  } finally {
    await cleanup(home);
  }
});

test('second Claude install refreshes plugins without duplicates', async (t) => {
  await isClaudeAvailable();
  if (skipWithoutClaude(t)) return;

  const home = await makeHome();
  try {
    await runCli(home, ['install', '--tools', 'claude', '--yes']);
    const plugins1 = await listClaudePlugins(home);
    assert.equal(plugins1.length, 5);

    const out = await runCli(home, ['install', '--tools', 'claude', '--yes']);
    for (const skill of SKILLS) {
      assert.match(out, new RegExp(`Installed ${skill}|✓ Installed ${skill}`), `reinstall should confirm ${skill}`);
    }
    const plugins2 = await listClaudePlugins(home);
    assert.equal(plugins2.length, 5);
    for (const skill of SKILLS) {
      assert.ok(plugins2.some(p => p.name === skill), `plugin ${skill} missing after reinstall`);
    }
  } finally {
    await cleanup(home);
  }
});

test('second Cursor install removes stale skill trees before copy', async () => {
  const home = await makeHome();
  try {
    await runCli(home, ['install', '--tools', 'cursor', '--yes']);
    const skillPath = join(cursorHome(home), 'skills', 'fw-app-dev', 'SKILL.md');
    await writeFile(skillPath, 'stale-content', 'utf8');

    await runCli(home, ['install', '--tools', 'cursor', '--yes']);
    const content = await readFile(skillPath, 'utf8');
    assert.notEqual(content, 'stale-content');
    assert.match(content, /^---/);
  } finally {
    await cleanup(home);
  }
});

test('Cursor install copies skill trees, rules, and shared scripts', async () => {
  const home = await makeHome();
  try {
    await runCli(home, ['install', '--tools', 'cursor', '--yes']);
    await access(join(cursorHome(home), 'skills', 'fw-app-dev', 'SKILL.md'));
    await access(join(cursorHome(home), 'rules', 'fw-dev-tools.mdc'));
    for (const script of SCRIPT_NAMES) {
      await access(join(devToolsHome(home), 'scripts', script));
    }
    const state = await readInstallState(home);
    assert.equal(state.client, 'cursor');
  } finally {
    await cleanup(home);
  }
});

test('update prints up-to-date when installed version matches latest', async () => {
  const home = await makeHome();
  try {
    await runCli(home, ['install', '--tools', 'cursor', '--yes']);
    const out = await runCli(home, ['update', '--yes'], {
      env: { FW_TEST_MOCK_LATEST_VERSION: PKG_VERSION },
    });
    assert.match(out, /up to date/i);
  } finally {
    await cleanup(home);
  }
});

test('update skips when user declines newer version', async () => {
  const home = await makeHome();
  try {
    await runCli(home, ['install', '--tools', 'cursor', '--yes']);
    const out = await runCli(home, ['update'], {
      env: { FW_TEST_MOCK_LATEST_VERSION: '99.99.99', FW_TEST_PROMPT_ANSWER: 'n' },
    });
    assert.match(out, /Update available/i);
    assert.match(out, /Update skipped/i);
    assert.equal(existsSync(join(cursorHome(home), 'skills', 'fw-app-dev')), true);
  } finally {
    await cleanup(home);
  }
});

test('uninstall claude,cursor removes all global install paths', async (t) => {
  await isClaudeAvailable();
  if (skipWithoutClaude(t)) return;

  const home = await makeHome();
  try {
    await runCli(home, ['install', '--tools', 'claude,cursor', '--yes']);
    await runCli(home, ['uninstall', '--tools', 'claude,cursor', '--yes']);

    assert.equal((await listClaudePlugins(home)).length, 0, 'claude plugins should be removed');
    assert.equal(existsSync(join(cursorHome(home), 'skills', 'fw-app-dev')), false);
    assert.equal(existsSync(join(cursorHome(home), 'rules', 'fw-dev-tools.mdc')), false);

    const mcpJson = join(cursorHome(home), 'mcp.json');
    if (existsSync(mcpJson)) {
      const mcpConfig = JSON.parse(await readFile(mcpJson, 'utf8'));
      assert.equal(mcpConfig.mcpServers?.['fw-dev-mcp'], undefined, 'fw-dev-mcp should be removed from mcp.json');
    }

    assert.equal(existsSync(join(devToolsHome(home), 'scripts')), false);
    assert.equal(existsSync(join(devToolsHome(home), '.meta.json')), false);
    await assertClaudeMdRouting(home, { present: false });
  } finally {
    await cleanup(home);
  }
});

test('per-app .meta.json survives global uninstall', async () => {
  const home = await makeHome();
  const appDir = join(home, 'test-app');
  try {
    await mkdir(appDir, { recursive: true });
    const appMeta = { tracking_id: 'abc123', source: 'ai_skills', 'fw-app-dev': { invoked: 1 } };
    await writeFile(join(appDir, '.meta.json'), JSON.stringify(appMeta, null, 2));

    await runCli(home, ['install', '--tools', 'cursor', '--yes']);
    await runCli(home, ['uninstall', '--tools', 'cursor', '--yes']);

    const survived = JSON.parse(await readFile(join(appDir, '.meta.json'), 'utf8'));
    assert.deepEqual(survived, appMeta);
  } finally {
    await cleanup(home);
  }
});

test('legacy install.json removed on Claude install', async (t) => {
  await isClaudeAvailable();
  if (skipWithoutClaude(t)) return;

  const home = await makeHome();
  try {
    await mkdir(join(devToolsHome(home)), { recursive: true });
    await writeFile(
      join(devToolsHome(home), 'install.json'),
      JSON.stringify({ version: '1.0.0', client: 'claude' }, null, 2),
    );

    const out = await runCli(home, ['install', '--tools', 'claude', '--yes']);
    assert.match(out, /Removed legacy install\.json/i);
    assert.equal(existsSync(join(devToolsHome(home), 'install.json')), false);
    assert.equal(existsSync(join(devToolsHome(home), '.meta.json')), true);
    for (const script of SCRIPT_NAMES) {
      await access(join(devToolsHome(home), 'scripts', script));
    }
    assert.equal((await listClaudePlugins(home)).length, 5);
  } finally {
    await cleanup(home);
  }
});

test('Cursor install warns about old .agents/skills, does not delete them', async () => {
  const home = await makeHome();
  const workspace = join(home, 'workspace');
  const agentsSkills = join(workspace, '.agents', 'skills', 'fw-setup');
  try {
    await mkdir(agentsSkills, { recursive: true });
    await writeFile(join(agentsSkills, 'SKILL.md'), '# legacy\n');

    const out = await runCli(home, ['install', '--tools', 'cursor', '--yes'], { cwd: workspace });
    assert.match(out, /Found old workspace skills/i);
    assert.match(out, /rm -rf .+\/fw-\*/);
    assert.equal(existsSync(join(agentsSkills, 'SKILL.md')), true, 'legacy workspace skills must not be auto-deleted');
    await access(join(cursorHome(home), 'skills', 'fw-setup', 'SKILL.md'));
    await access(join(cursorHome(home), 'rules', 'fw-dev-tools.mdc'));
  } finally {
    await cleanup(home);
  }
});

test('Cursor uninstall removes fw-dev-mcp from mcp.json while preserving other servers', async () => {
  const home = await makeHome();
  try {
    await runCli(home, ['install', '--tools', 'cursor', '--yes']);

    const mcpJson = join(cursorHome(home), 'mcp.json');
    const withOther = {
      mcpServers: {
        'fw-dev-mcp': JSON.parse(await readFile(mcpJson, 'utf8')).mcpServers['fw-dev-mcp'],
        'other-server': { url: 'https://other.example.com/mcp' },
      },
    };
    await writeFile(mcpJson, JSON.stringify(withOther, null, 2), 'utf8');

    await runCli(home, ['uninstall', '--tools', 'cursor', '--yes']);

    assert.equal(existsSync(mcpJson), true, 'mcp.json should remain when other servers exist');
    const remaining = JSON.parse(await readFile(mcpJson, 'utf8'));
    assert.equal(remaining.mcpServers['fw-dev-mcp'], undefined);
    assert.deepEqual(remaining.mcpServers['other-server'], withOther.mcpServers['other-server']);
  } finally {
    await cleanup(home);
  }
});

test('stale fw-marketplace-app-dev removed on Cursor install', async () => {
  const home = await makeHome();
  const staleDir = join(cursorHome(home), 'skills', 'fw-marketplace-app-dev');
  try {
    await mkdir(staleDir, { recursive: true });
    await writeFile(join(staleDir, 'SKILL.md'), '# stale\n');

    const out = await runCli(home, ['install', '--tools', 'cursor', '--yes']);
    assert.match(out, /Removed \d+ previous fw-dev-tools skill\(s\)/i);
    assert.equal(existsSync(staleDir), false);
    await access(join(cursorHome(home), 'skills', 'fw-app-dev', 'SKILL.md'));
  } finally {
    await cleanup(home);
  }
});
