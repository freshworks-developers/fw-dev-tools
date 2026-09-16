import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';

process.env.FW_DEV_TOOLS_HOME = join(
  tmpdir(),
  `fw-utils-home-${Date.now()}-${Math.floor(Math.random() * 10000)}`
);

const {
  copyScripts,
  copySkills,
  copySpecs,
  INSTALL_JSON,
  readInstallState,
  removeClaudePluginCache,
  removeFwSkillDirs,
  VERSION,
  writeInstallState,
  SHIPPED_SPECS,
  BRAIN_SPEC_INSTALLER,
  BRAIN_SPEC_SRC,
  SCRIPTS_SRC,
} = await import('../src/utils.js');

after(async () => {
  await rm(dirname(INSTALL_JSON), { recursive: true, force: true });
});

async function makeTmp() {
  const dir = join(tmpdir(), `utils-test-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// copySkills
// ---------------------------------------------------------------------------

test('copySkills creates target dir if absent', async () => {
  const tmp = await makeTmp();
  const dest = join(tmp, 'skills-out');
  await copySkills(dest);
  assert.ok(existsSync(dest));
  await rm(tmp, { recursive: true });
});

test('copySkills copies all 5 skill subdirectories', async () => {
  const tmp = await makeTmp();
  const dest = join(tmp, 'skills-out');
  await copySkills(dest);
  const expected = ['fw-setup', 'fw-app-dev', 'fw-ai-actions-app', 'fw-review', 'fw-publish'];
  for (const skill of expected) {
    assert.ok(existsSync(join(dest, skill)), `${skill} should be copied`);
    assert.ok(existsSync(join(dest, skill, 'SKILL.md')), `${skill}/SKILL.md should exist`);
  }
  await rm(tmp, { recursive: true });
});

test('copySkills does not copy skills/shared into target dir', async () => {
  const tmp = await makeTmp();
  const dest = join(tmp, 'skills-out');
  await copySkills(dest);
  assert.ok(!existsSync(join(dest, 'shared')), 'skills/shared must not be copied to IDE skills dir');
  await rm(tmp, { recursive: true });
});

test('copySkills copies only installable skill names', async () => {
  const tmp = await makeTmp();
  const dest = join(tmp, 'skills-out');
  await copySkills(dest);
  const { readdir } = await import('node:fs/promises');
  const entries = (await readdir(dest, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const expected = [
    'fw-ai-actions-app',
    'fw-app-dev',
    'fw-publish',
    'fw-review',
    'fw-setup',
  ].sort();
  assert.deepEqual(entries, expected);
  await rm(tmp, { recursive: true });
});

test('copySkills overwrites existing skills on re-run', async () => {
  const tmp = await makeTmp();
  const dest = join(tmp, 'skills-out');

  await copySkills(dest);

  const target = join(dest, 'fw-setup', 'SKILL.md');
  await writeFile(target, 'corrupted', 'utf8');
  assert.equal(await readFile(target, 'utf8'), 'corrupted');

  await copySkills(dest);
  const content = await readFile(target, 'utf8');
  assert.notEqual(content, 'corrupted', 'SKILL.md should be restored on re-run');
  await rm(tmp, { recursive: true });
});

test('removeFwSkillDirs removes fw-dev-tools skills but not unrelated dirs', async () => {
  const tmp = await makeTmp();
  const skillsRoot = join(tmp, 'skills');
  await mkdir(join(skillsRoot, 'fw-app-dev'), { recursive: true });
  await mkdir(join(skillsRoot, 'fw-marketplace-app-dev'), { recursive: true });
  await mkdir(join(skillsRoot, 'other-skill'), { recursive: true });
  const removed = await removeFwSkillDirs(skillsRoot);
  assert.equal(removed, 2);
  assert.ok(!existsSync(join(skillsRoot, 'fw-app-dev')));
  assert.ok(!existsSync(join(skillsRoot, 'fw-marketplace-app-dev')));
  assert.ok(existsSync(join(skillsRoot, 'other-skill')));
  await rm(tmp, { recursive: true });
});

test('removeClaudePluginCache removes marketplace cache tree', async () => {
  const tmp = await makeTmp();
  const cacheRoot = join(tmp, 'freshworks-dev-tools');
  const staleSkill = join(cacheRoot, 'fw-review', '1.0.0');
  await mkdir(staleSkill, { recursive: true });
  await writeFile(join(staleSkill, 'SKILL.md'), 'version: "1.0.0"\n', 'utf8');

  assert.equal(await removeClaudePluginCache(cacheRoot), true);
  assert.equal(existsSync(cacheRoot), false);
  assert.equal(await removeClaudePluginCache(cacheRoot), false);
  await rm(tmp, { recursive: true });
});

// ---------------------------------------------------------------------------
// copyScripts
// ---------------------------------------------------------------------------

test('copyScripts installs every shipped script', async () => {
  await copyScripts();
  const dest = join(dirname(INSTALL_JSON), 'scripts');
  for (const file of await readdir(SCRIPTS_SRC)) {
    assert.ok(existsSync(join(dest, file)), `${file} should be installed`);
  }
});

test('copyScripts prunes scripts that no longer ship', async () => {
  const dest = join(dirname(INSTALL_JSON), 'scripts');
  await copyScripts();

  // Simulate a script that shipped in an older version (e.g. the separate
  // per-intent checklist mappers before they were consolidated).
  const stale = join(dest, 'migrate-to-todos.sh');
  await writeFile(stale, '#!/usr/bin/env bash\necho stale\n', 'utf8');
  assert.ok(existsSync(stale), 'precondition: stale script present');

  await copyScripts();

  assert.ok(!existsSync(stale), 'stale script must be pruned on re-install');
  assert.ok(
    existsSync(join(dest, 'session-to-todos.sh')),
    'current scripts must survive the prune'
  );
});

test('copyScripts prune keeps the dir identical to source', async () => {
  const dest = join(dirname(INSTALL_JSON), 'scripts');
  await writeFile(join(dest, 'orphan.sh'), 'echo orphan\n', 'utf8');
  await copyScripts();
  assert.deepEqual(
    (await readdir(dest)).sort(),
    (await readdir(SCRIPTS_SRC)).sort(),
    'installed scripts dir should match shipped scripts exactly'
  );
});

// ---------------------------------------------------------------------------
// copySpecs
// ---------------------------------------------------------------------------

test('copySpecs copies shipped Tier 2 specs to fw-dev-tools dir', async () => {
  const tmp = await makeTmp();
  const specsDir = join(tmp, 'specs');
  await copySpecs(specsDir, { syncInstaller: false });
  for (const file of SHIPPED_SPECS) {
    assert.ok(existsSync(join(specsDir, file)), `${file} should be copied to specs dir`);
  }
  await rm(tmp, { recursive: true, force: true });
});

test('copySpecs syncs agent behaviour into installer package specs from repo checkout', async () => {
  const tmp = await makeTmp();
  await copySpecs(join(tmp, 'specs'));
  assert.ok(existsSync(BRAIN_SPEC_INSTALLER), 'agent-behaviour should sync to installer/src/specs/');
  const src = await readFile(BRAIN_SPEC_SRC, 'utf8');
  const installed = await readFile(BRAIN_SPEC_INSTALLER, 'utf8');
  assert.equal(installed, src, 'installer brain spec must match specs/agent-behaviour.md');
  await rm(tmp, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// writeInstallState / readInstallState
// ---------------------------------------------------------------------------

test('writeInstallState writes correct JSON shape', async () => {
  const written = await writeInstallState({ client: 'cursor' });
  assert.equal(written.version, VERSION);
  assert.equal(written.client, 'cursor');
  assert.equal(written.method, 'npx');
  assert.ok(written.installedAt, 'installedAt should be set');
  assert.ok(!Number.isNaN(Date.parse(written.installedAt)), 'installedAt should be a valid ISO date');
  assert.deepEqual(written.update_check, {
    lastChecked: null,
    lastNudged: null,
    latestVersion: null,
    updateAvailable: false,
  });
  await rm(INSTALL_JSON, { force: true });
});

test('writeInstallState accepts custom method', async () => {
  const written = await writeInstallState({ client: 'claude', method: 'npm' });
  assert.equal(written.method, 'npm');
  await rm(INSTALL_JSON, { force: true });
});

test('writeInstallState initialises clients array on first write', async () => {
  await rm(INSTALL_JSON, { force: true });
  const written = await writeInstallState({ client: 'cursor' });
  assert.deepEqual(written.clients, ['cursor']);
  await rm(INSTALL_JSON, { force: true });
});

test('writeInstallState accumulates clients array across multiple writes', async () => {
  await rm(INSTALL_JSON, { force: true });
  await writeInstallState({ client: 'cursor' });
  await writeInstallState({ client: 'claude' });
  const written = await writeInstallState({ client: 'codex' });
  assert.deepEqual(written.clients, ['cursor', 'claude', 'codex']);
  await rm(INSTALL_JSON, { force: true });
});

test('writeInstallState does not duplicate client in array', async () => {
  await rm(INSTALL_JSON, { force: true });
  await writeInstallState({ client: 'cursor' });
  const written = await writeInstallState({ client: 'cursor' });
  assert.deepEqual(written.clients, ['cursor']);
  await rm(INSTALL_JSON, { force: true });
});

test('writeInstallState migrates legacy single client field to array', async () => {
  await mkdir(dirname(INSTALL_JSON), { recursive: true });
  await writeFile(INSTALL_JSON, JSON.stringify({ client: 'cursor', version: VERSION }), 'utf8');
  const written = await writeInstallState({ client: 'claude' });
  assert.deepEqual(written.clients, ['cursor', 'claude']);
  await rm(INSTALL_JSON, { force: true });
});

test('readInstallState round-trips written state', async () => {
  await writeInstallState({ client: 'codex' });
  const state = await readInstallState();
  assert.equal(state.version, VERSION);
  assert.equal(state.client, 'codex');
  await rm(INSTALL_JSON, { force: true });
});

test('readInstallState returns null when file does not exist', async () => {
  await rm(INSTALL_JSON, { force: true });
  const state = await readInstallState();
  assert.equal(state, null);
});

test('readInstallState returns null for broken JSON', async () => {
  await mkdir(dirname(INSTALL_JSON), { recursive: true });
  await writeFile(INSTALL_JSON, '{ broken', 'utf8');
  const state = await readInstallState();
  assert.equal(state, null);
  await rm(INSTALL_JSON, { force: true });
});
