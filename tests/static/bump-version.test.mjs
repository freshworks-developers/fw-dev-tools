/**
 * Unit test for scripts/bump-version.mjs — propagates marketplace/package.json
 * version to installer, SKILL.md frontmatter, and all plugin manifests.
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const execFileAsync = promisify(execFile);

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILLS = ['fw-setup', 'fw-app-dev', 'fw-build-your-mcp-app', 'fw-review', 'fw-publish'];
/** Isolated fixture version only — not the published fleet version. */
const TEST_VERSION = '9.8.7';
const BUMP_SCRIPT_REL = 'scripts/bump-version.mjs';

const COPY_ITEMS = [
  'package.json',
  'installer',
  'skills',
  '.claude-plugin',
  '.cursor-plugin',
  '.codex-plugin',
  'scripts',
];

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function skillFrontmatterVersion(skillMdPath) {
  const raw = await readFile(skillMdPath, 'utf8');
  const m = raw.match(/^version:\s*"?([^"\n]+)"?/m);
  assert.ok(m, `${skillMdPath} missing version frontmatter`);
  return m[1];
}

async function makeBumpFixture() {
  const dir = await mkdtemp(join(tmpdir(), 'bump-version-'));
  for (const item of COPY_ITEMS) {
    await cp(join(REPO_ROOT, item), join(dir, item), { recursive: true });
  }
  const rootPkg = await readJson(join(dir, 'package.json'));
  rootPkg.version = TEST_VERSION;
  await writeFile(join(dir, 'package.json'), `${JSON.stringify(rootPkg, null, 2)}\n`, 'utf8');
  return dir;
}

async function collectVersions(dir) {
  const checks = [];

  checks.push([
    'installer/package.json',
    (await readJson(join(dir, 'installer', 'package.json'))).version,
  ]);

  for (const skill of SKILLS) {
    checks.push([
      `skills/${skill}/SKILL.md`,
      await skillFrontmatterVersion(join(dir, 'skills', skill, 'SKILL.md')),
    ]);
    for (const pluginDir of ['.claude-plugin', '.cursor-plugin']) {
      const rel = `skills/${skill}/${pluginDir}/plugin.json`;
      checks.push([rel, (await readJson(join(dir, rel))).version]);
    }
  }

  for (const manifest of ['.claude-plugin/marketplace.json', '.cursor-plugin/marketplace.json']) {
    const mp = await readJson(join(dir, manifest));
    checks.push([`${manifest} (top)`, mp.version]);
    for (const plugin of mp.plugins) {
      checks.push([`${manifest} plugins[].${plugin.name}`, plugin.version]);
    }
  }

  for (const rel of [
    '.claude-plugin/plugin.json',
    '.cursor-plugin/plugin.json',
    '.codex-plugin/plugin.json',
  ]) {
    checks.push([rel, (await readJson(join(dir, rel))).version]);
  }

  return checks;
}

test('bump-version.mjs propagates root version to all release artifacts', async () => {
  const dir = await makeBumpFixture();
  try {
    await execFileAsync('node', [BUMP_SCRIPT_REL], { cwd: dir });
    const checks = await collectVersions(dir);
    const mismatches = checks.filter(([, version]) => version !== TEST_VERSION);
    assert.equal(
      mismatches.length,
      0,
      `bump-version.mjs missed ${mismatches.length}/${checks.length} touchpoints:\n${mismatches.map(([path, v]) => `  ${path} => ${v}`).join('\n')}`
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('bump-version.mjs does not update unquoted SKILL.md version frontmatter', async () => {
  const dir = await makeBumpFixture();
  const skillMd = join(dir, 'skills', 'fw-app-dev', 'SKILL.md');
  try {
    const raw = await readFile(skillMd, 'utf8');
    const unquoted = raw.replace(/^version: "[\d.]+"/m, 'version: 0.0.1');
    await writeFile(skillMd, unquoted, 'utf8');

    await execFileAsync('node', [BUMP_SCRIPT_REL], { cwd: dir });

    const ver = await skillFrontmatterVersion(skillMd);
    assert.equal(
      ver,
      '0.0.1',
      'bump-version.mjs only rewrites quoted version: "x.y.z" frontmatter (keep SKILL.md quoted)'
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
