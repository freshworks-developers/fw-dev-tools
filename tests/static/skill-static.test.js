/**
 * Layer 1: Static skill file tests — no LLM, CI-safe.
 * Asserts structural correctness of skill files and supporting assets.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat, readdir } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

// Cross-platform recursive grep — avoids shell grep which behaves differently
// on macOS (BSD grep, no --exclude-dir) and is unavailable on Windows.
const GREP_EXTENSIONS = new Set(['.md', '.json', '.mdc', '.txt', '.js', '.ts']);
async function grepFiles(dir, needle, { skipDirs = [] } = {}) {
  const skipSet = new Set(skipDirs);
  const hits = [];
  async function walk(current) {
    let entries;
    try { entries = await readdir(current, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') || skipSet.has(e.name)) continue;
      const full = join(current, e.name);
      if (e.isDirectory()) { await walk(full); continue; }
      if (!GREP_EXTENSIONS.has(extname(e.name))) continue;
      const text = await readFile(full, 'utf8').catch(() => '');
      if (text.includes(needle)) hits.push(full.replace(dir + '/', ''));
    }
  }
  await walk(dir);
  return hits;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', '..', 'skills');
const TEMPLATES_DIR = join(SKILLS_DIR, 'fw-app-dev', 'assets', 'templates');

const SKILLS = [
  'fw-setup',
  'fw-app-dev',
  'fw-ai-actions-app',
  'fw-review',
  'fw-publish',
];

/** OpenAI Codex rejects SKILL.md when YAML description exceeds this length. */
const CODEX_MAX_DESCRIPTION_LENGTH = 1024;

const SKELETON_MANIFESTS = [
  join(TEMPLATES_DIR, 'frontend-skeleton', 'manifest.json'),
  join(TEMPLATES_DIR, 'serverless-skeleton', 'manifest.json'),
  join(TEMPLATES_DIR, 'hybrid-skeleton', 'manifest.json'),
  join(TEMPLATES_DIR, 'react-meta-frontend-skeleton', 'manifest.json'),
  join(TEMPLATES_DIR, 'react-meta-hybrid-skeleton', 'manifest.json'),
  join(TEMPLATES_DIR, 'react-meta-oauth-skeleton', 'manifest.json'),
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readSkill(name) {
  return readFile(join(SKILLS_DIR, name, 'SKILL.md'), 'utf8');
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return null;
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return null;
  const block = content.slice(4, end);
  const fields = {};
  for (const line of block.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '');
    fields[key] = val;
  }
  return fields;
}

// ---------------------------------------------------------------------------
// Frontmatter — all skills
// ---------------------------------------------------------------------------

describe('Skill frontmatter', () => {
  for (const skill of SKILLS) {
    test(`${skill}: has valid frontmatter with required fields`, async () => {
      const content = await readSkill(skill);
      assert.ok(content.startsWith('---\n'), `${skill}/SKILL.md must start with ---`);

      const fm = parseFrontmatter(content);
      assert.ok(fm, `${skill}/SKILL.md frontmatter must close with ---`);
      assert.ok(fm.name, `${skill}: frontmatter must have 'name' field`);
      assert.ok(fm.version, `${skill}: frontmatter must have 'version' field`);
      assert.ok(fm.description, `${skill}: frontmatter must have 'description' field`);
    });

    test(`${skill}: version is valid semver`, async () => {
      const content = await readSkill(skill);
      const fm = parseFrontmatter(content);
      assert.match(fm.version, /^\d+\.\d+\.\d+$/, `${skill}: version must be semver (e.g. 1.0.0)`);
    });

    test(`${skill}: description ≤ ${CODEX_MAX_DESCRIPTION_LENGTH} chars (Codex limit)`, async () => {
      const content = await readSkill(skill);
      const fm = parseFrontmatter(content);
      assert.ok(fm.description, `${skill}: description required`);
      assert.ok(
        fm.description.length <= CODEX_MAX_DESCRIPTION_LENGTH,
        `${skill}: description is ${fm.description.length} chars (max ${CODEX_MAX_DESCRIPTION_LENGTH} for Codex)`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Gate language — all skills
// ---------------------------------------------------------------------------

describe('Skill gate language', () => {
  for (const skill of SKILLS) {
    test(`${skill}: contains MANDATORY gate language (DO NOT SKIP)`, async () => {
      const content = await readSkill(skill);
      assert.ok(
        content.includes('DO NOT SKIP'),
        `${skill}: must contain 'DO NOT SKIP' gate language`
      );
    });

    test(`${skill}: gates output behind .meta.json write (DO NOT ... before)`, async () => {
      const content = await readSkill(skill);
      const hasOutputGate =
        content.includes('DO NOT proceed') ||
        content.includes('DO NOT emit') ||
        content.includes('DO NOT report') ||
        content.includes('DO NOT present') ||
        content.includes('before this is done') ||
        content.includes('before telling');
      assert.ok(hasOutputGate, `${skill}: must gate user-visible output behind .meta.json write`);
    });
  }
});

// ---------------------------------------------------------------------------
// .meta.json write pattern — all skills
// ---------------------------------------------------------------------------

describe('.meta.json write pattern', () => {
  for (const skill of SKILLS) {
    test(`${skill}: references meta-init.sh (script-based pattern)`, async () => {
      const content = await readSkill(skill);
      assert.ok(
        content.includes('meta-init.sh'),
        `${skill}: must reference meta-init.sh for .meta.json initialisation`
      );
    });

    test(`${skill}: references meta-update.sh (script-based update pattern)`, async () => {
      const content = await readSkill(skill);
      assert.ok(
        content.includes('meta-update.sh'),
        `${skill}: must reference meta-update.sh for .meta.json updates`
      );
    });

    test(`${skill}: instructs to never mention .meta.json to developer`, async () => {
      const content = await readSkill(skill);
      assert.ok(
        content.includes('Never mention') && content.includes('.meta.json'),
        `${skill}: must contain 'Never mention ... .meta.json' instruction`
      );
    });

    test(`${skill}: forbids hand-writing .meta.json`, async () => {
      const content = await readSkill(skill);
      assert.ok(
        content.includes('DO NOT hand-write JSON'),
        `${skill}: must forbid hand-writing .meta.json`
      );
      assert.ok(
        content.includes('meta-init.sh') && content.includes('meta-update.sh'),
        `${skill}: must require meta scripts`
      );
    });

    test(`${skill}: skill_version from this SKILL.md`, async () => {
      const content = await readSkill(skill);
      assert.ok(
        /skill_version.*(?:SKILL\.md|YAML frontmatter)|(?:SKILL\.md|YAML frontmatter).*skill_version/s.test(content),
        `${skill}: must source skill_version from SKILL.md frontmatter`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// SKILL.md version vs plugin.json
// ---------------------------------------------------------------------------

describe('SKILL.md version matches plugin.json', () => {
  async function skillFrontmatterVersion(skill) {
    const raw = await readSkill(skill);
    const m = raw.match(/^version:\s*"?([^"\n]+)"?/m);
    assert.ok(m, `${skill}: SKILL.md missing version frontmatter`);
    return m[1];
  }

  for (const skill of SKILLS) {
    test(`${skill}: SKILL.md version matches .claude-plugin/plugin.json`, async () => {
      const skillVer = await skillFrontmatterVersion(skill);
      const plugin = await readJson(`skills/${skill}/.claude-plugin/plugin.json`);
      assert.equal(skillVer, plugin.version, `${skill}: SKILL.md and claude plugin.json versions must match`);
    });

    test(`${skill}: SKILL.md version matches .cursor-plugin/plugin.json`, async () => {
      const skillVer = await skillFrontmatterVersion(skill);
      const plugin = await readJson(`skills/${skill}/.cursor-plugin/plugin.json`);
      assert.equal(skillVer, plugin.version, `${skill}: SKILL.md and cursor plugin.json versions must match`);
    });
  }
});

// ---------------------------------------------------------------------------
// Release hygiene — single fleet version across all release artifacts
// ---------------------------------------------------------------------------

describe('Release hygiene — fleet version lock', () => {
  async function skillFrontmatterVersion(skill) {
    const raw = await readSkill(skill);
    const m = raw.match(/^version:\s*"?([^"\n]+)"?/m);
    assert.ok(m, `${skill}: SKILL.md missing version frontmatter`);
    return m[1];
  }

  test('marketplace/package.json version propagates to installer, SKILL.md, and plugin manifests', async () => {
    const rootPkg = JSON.parse(
      await readFile(join(__dirname, '..', '..', 'package.json'), 'utf8')
    );
    const canonical = rootPkg.version;
    assert.ok(canonical, 'marketplace/package.json must define version');

    const installerPkg = JSON.parse(
      await readFile(join(__dirname, '..', '..', 'installer', 'package.json'), 'utf8')
    );
    assert.equal(
      installerPkg.version,
      canonical,
      'installer/package.json must match marketplace/package.json (run scripts/bump-version.mjs)'
    );

    for (const skill of SKILLS) {
      assert.equal(
        await skillFrontmatterVersion(skill),
        canonical,
        `${skill}/SKILL.md version must match fleet release`
      );
      for (const pluginDir of ['.claude-plugin', '.cursor-plugin']) {
        const plugin = await readJson(`skills/${skill}/${pluginDir}/plugin.json`);
        assert.equal(
          plugin.version,
          canonical,
          `${skill}/${pluginDir}/plugin.json must match fleet release`
        );
      }
    }

    for (const manifest of ['.claude-plugin/marketplace.json', '.cursor-plugin/marketplace.json']) {
      const mp = await readJson(manifest);
      assert.equal(mp.version, canonical, `${manifest} top-level version`);
      for (const plugin of mp.plugins) {
        assert.equal(
          plugin.version,
          canonical,
          `${manifest} plugins[].${plugin.name} version`
        );
      }
    }
  });
});

// ---------------------------------------------------------------------------
// .meta.json template file
// ---------------------------------------------------------------------------

describe('.meta.json template', () => {
  let template;

  test('skills/shared/.meta.template.json is valid JSON', async () => {
    const raw = await readFile(join(SKILLS_DIR, 'shared', '.meta.template.json'), 'utf8');
    template = JSON.parse(raw);
    assert.ok(template, 'template must parse as JSON');
  });

  test('template has all required top-level fields', async () => {
    const raw = await readFile(join(SKILLS_DIR, 'shared', '.meta.template.json'), 'utf8');
    const t = JSON.parse(raw);
    for (const field of ['tracking_id', 'source', 'ide_client', 'start_time']) {
      assert.ok(Object.hasOwn(t, field), `template missing top-level field: ${field}`);
    }
    assert.equal(t.source, 'ai_skills', "template source must be 'ai_skills'");
  });

  test('template has all 5 skill blocks', async () => {
    const raw = await readFile(join(SKILLS_DIR, 'shared', '.meta.template.json'), 'utf8');
    const t = JSON.parse(raw);
    for (const skill of SKILLS) {
      assert.ok(Object.hasOwn(t, skill), `template missing skill block: ${skill}`);
    }
  });

  test('each skill block has invoked and skill_version fields', async () => {
    const raw = await readFile(join(SKILLS_DIR, 'shared', '.meta.template.json'), 'utf8');
    const t = JSON.parse(raw);
    for (const skill of SKILLS) {
      assert.ok(Object.hasOwn(t[skill], 'invoked'), `${skill} block missing 'invoked'`);
      assert.ok(Object.hasOwn(t[skill], 'skill_version'), `${skill} block missing 'skill_version'`);
      assert.equal(t[skill].invoked, 0, `${skill}.invoked default must be 0`);
    }
  });

  test('fw-app-dev block has iteration tracking fields', async () => {
    const raw = await readFile(join(SKILLS_DIR, 'shared', '.meta.template.json'), 'utf8');
    const t = JSON.parse(raw);
    const block = t['fw-app-dev'];
    for (const field of ['migrate_iterations', 'validate_iterations', 'validation_error_categories', 'react_meta_workflow']) {
      assert.ok(Object.hasOwn(block, field), `fw-app-dev block missing field: ${field}`);
    }
    assert.deepEqual(block.validation_error_categories, []);
    assert.equal(block.react_meta_workflow, '');
  });

  test('fw-review block has review_failure_categories', async () => {
    const raw = await readFile(join(SKILLS_DIR, 'shared', '.meta.template.json'), 'utf8');
    const t = JSON.parse(raw);
    assert.deepEqual(t['fw-review'].review_failure_categories, []);
  });

  test('fw-publish block has publish_outcome field', async () => {
    const raw = await readFile(join(SKILLS_DIR, 'shared', '.meta.template.json'), 'utf8');
    const t = JSON.parse(raw);
    assert.ok(Object.hasOwn(t['fw-publish'], 'publish_outcome'), 'fw-publish missing publish_outcome');
  });

  test('fw-setup block has setup_node_changed and setup_fdk_changed', async () => {
    const raw = await readFile(join(SKILLS_DIR, 'shared', '.meta.template.json'), 'utf8');
    const t = JSON.parse(raw);
    assert.ok(Object.hasOwn(t['fw-setup'], 'setup_node_changed'));
    assert.ok(Object.hasOwn(t['fw-setup'], 'setup_fdk_changed'));
  });

  test('template has update_check block for install state', async () => {
    const raw = await readFile(join(SKILLS_DIR, 'shared', '.meta.template.json'), 'utf8');
    const t = JSON.parse(raw);
    for (const field of ['lastChecked', 'lastNudged', 'latestVersion', 'updateAvailable']) {
      assert.ok(Object.hasOwn(t.update_check, field), `update_check missing field: ${field}`);
    }
    assert.equal(t.update_check.lastChecked, null);
    assert.equal(t.update_check.updateAvailable, false);
  });

  test('scripts/.meta.template.json matches skills/shared/.meta.template.json', async () => {
    const root = await readFile(join(SKILLS_DIR, 'shared', '.meta.template.json'), 'utf8');
    const scripts = await readFile(join(SKILLS_DIR, 'shared', 'scripts', '.meta.template.json'), 'utf8');
    assert.deepEqual(JSON.parse(root), JSON.parse(scripts), 'template copies must stay in sync');
  });
});

// ---------------------------------------------------------------------------
// Manifest skeleton templates
// ---------------------------------------------------------------------------

describe('Manifest skeleton templates', () => {
  for (const manifestPath of SKELETON_MANIFESTS) {
    const label = manifestPath.replace(/.*templates\//, '');

    test(`${label}: is valid JSON with platform-version 3.0`, async () => {
      const raw = await readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(raw);
      assert.equal(manifest['platform-version'], '3.0', `${label}: platform-version must be 3.0`);
    });

    test(`${label}: uses 'modules' not 'product'`, async () => {
      const raw = await readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(raw);
      assert.ok(Object.hasOwn(manifest, 'modules'), `${label}: must have 'modules' key`);
      assert.ok(!Object.hasOwn(manifest, 'product'), `${label}: must not have deprecated 'product' key`);
    });

    test(`${label}: has engines with node and fdk`, async () => {
      const raw = await readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(raw);
      assert.ok(manifest.engines?.node, `${label}: engines.node missing`);
      assert.ok(manifest.engines?.fdk, `${label}: engines.fdk missing`);
    });

    test(`${label}: app block has no tracking fields`, async () => {
      const raw = await readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(raw);
      const app = manifest.app ?? {};
      assert.ok(!Object.hasOwn(app, 'tracking_id'), `${label}: tracking_id must not be in manifest.app`);
      assert.ok(!Object.hasOwn(app, 'start_time'), `${label}: start_time must not be in manifest.app`);
    });
  }
});

// ---------------------------------------------------------------------------
// Line count warnings (not failures)
// ---------------------------------------------------------------------------

describe('Skill file line counts', () => {
  for (const skill of SKILLS) {
    test(`${skill}: line count check (warn if > 500)`, async () => {
      const content = await readSkill(skill);
      const lines = content.split('\n').length;
      if (lines > 500) {
        console.warn(`⚠ WARNING: ${skill}/SKILL.md is ${lines} lines (exceeds 500-line guideline)`);
      }
      // Not a hard failure — just log it
      assert.ok(true);
    });
  }
});

// ---------------------------------------------------------------------------
// fw-app-dev command files
// ---------------------------------------------------------------------------

describe('fw-app-dev command files', () => {
  const commands = ['fdk-fix', 'fdk-migrate', 'fdk-react-create', 'fdk-react-migrate'];

  for (const cmd of commands) {
    test(`${cmd}.md: contains MANDATORY .meta.json write step`, async () => {
      const content = await readFile(
        join(SKILLS_DIR, 'fw-app-dev', 'commands', `${cmd}.md`),
        'utf8'
      );
      assert.ok(
        content.includes('MANDATORY') && content.includes('.meta.json'),
        `${cmd}.md must have MANDATORY .meta.json write step`
      );
    });

    test(`${cmd}.md: uses meta-init.sh script pattern`, async () => {
      const content = await readFile(
        join(SKILLS_DIR, 'fw-app-dev', 'commands', `${cmd}.md`),
        'utf8'
      );
      assert.ok(
        content.includes('meta-init.sh'),
        `${cmd}.md must reference meta-init.sh`
      );
    });

    test(`${cmd}.md: uses meta-update.sh script pattern`, async () => {
      const content = await readFile(
        join(SKILLS_DIR, 'fw-app-dev', 'commands', `${cmd}.md`),
        'utf8'
      );
      assert.ok(
        content.includes('meta-update.sh'),
        `${cmd}.md must reference meta-update.sh`
      );
    });

    test(`${cmd}.md: forbids hand-writing .meta.json`, async () => {
      const content = await readFile(
        join(SKILLS_DIR, 'fw-app-dev', 'commands', `${cmd}.md`),
        'utf8'
      );
      assert.ok(
        content.includes('DO NOT hand-write JSON'),
        `${cmd}.md must forbid hand-writing .meta.json`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// React Meta skeleton templates
// ---------------------------------------------------------------------------

describe('React Meta skeleton templates', () => {
  const REACT_META_SKELETONS = [
    'react-meta-frontend-skeleton',
    'react-meta-hybrid-skeleton',
    'react-meta-oauth-skeleton',
  ];

  for (const name of REACT_META_SKELETONS) {
    const base = join(TEMPLATES_DIR, name);

    test(`${name}: manifest has metaConfig.framework react`, async () => {
      const manifest = JSON.parse(await readFile(join(base, 'manifest.json'), 'utf8'));
      assert.equal(manifest.metaConfig?.framework, 'react');
    });

    test(`${name}: package.json has DEW deps, react-error-boundary, and no Crayons`, async () => {
      const pkg = JSON.parse(await readFile(join(base, 'package.json'), 'utf8'));
      const deps = pkg.dependencies ?? {};
      assert.ok(deps['@freshworks/dew-components'], 'must include dew-components');
      assert.ok(deps['@freshworks/dew-styles'], 'must include dew-styles');
      assert.ok(deps['react-error-boundary'], 'must include react-error-boundary');
      assert.ok(!deps['@freshworks/crayons'], 'must not include crayons');
    });

    test(`${name}: App.jsx includes path="*" route`, async () => {
      const app = await readFile(join(base, 'app', 'components', 'App.jsx'), 'utf8');
      assert.ok(app.includes('path="*"'), 'Router must include path="*" fallback');
    });

    test(`${name}: index.html at app root`, async () => {
      assert.ok(await fileExists(join(base, 'app', 'index.html')), 'app/index.html must exist');
    });

    test(`${name}: index.html includes appclient script`, async () => {
      const html = await readFile(join(base, 'app', 'index.html'), 'utf8');
      assert.ok(html.includes('{{{appclient}}}'), 'index.html must include {{{appclient}}} for PlaceholderWrapper');
    });

    test(`${name}: index.jsx does not wrap root in DewTheme`, async () => {
      const entry = await readFile(join(base, 'app', 'index.jsx'), 'utf8');
      assert.ok(!entry.includes('<DewTheme'), 'DewTheme is not a React component — must not wrap App root');
      assert.ok(entry.includes('./styles/app.css'), 'index.jsx must import app.css (DEW tokens + app styles)');
      assert.ok(entry.includes('./mount'), 'index.jsx must delegate render to app/mount.jsx');
    });

    test(`${name}: app/styles/app.css loads DEW token CSS`, async () => {
      const css = await readFile(join(base, 'app', 'styles', 'app.css'), 'utf8');
      assert.ok(css.includes('@freshworks/dew-styles/dist/colors.css'));
      assert.ok(css.includes('fonts.css'));
      assert.ok(css.includes('numbers.css'));
    });

    test(`${name}: mount.jsx uses react-error-boundary`, async () => {
      const mount = await readFile(join(base, 'app', 'mount.jsx'), 'utf8');
      assert.ok(mount.includes('react-error-boundary'), 'mount.jsx should import react-error-boundary');
      assert.ok(mount.includes('ErrorBoundary'), 'mount.jsx should wrap App in ErrorBoundary');
      assert.ok(mount.includes('ErrorFallback'), 'mount.jsx should use shared ErrorFallback component');
      assert.ok(mount.includes('mountApp'), 'mount.jsx must export mountApp');
      assert.ok(await fileExists(join(base, 'app', 'components', 'ErrorFallback.jsx')));
    });
  }

  test('react-meta reference docs mention vite merge and Tailwind', async () => {
    const vite = await readRepo('skills/fw-app-dev/references/react-meta/vite-config.md');
    const styling = await readRepo('skills/fw-app-dev/references/react-meta/styling-and-third-party.md');
    assert.ok(vite.includes('deep-merge') || vite.includes('deep-merges'));
    assert.ok(vite.includes('FDK wins'));
    assert.ok(styling.includes('Tailwind'));
  });

  test('dew-components.md requires DEW packages and Storybook', async () => {
    const dew = await readRepo('skills/fw-app-dev/references/react-meta/dew-components.md');
    assert.ok(dew.includes('@freshworks/dew-components'));
    assert.ok(dew.includes('@freshworks/dew-styles'));
    assert.ok(dew.includes('dew.freshworkscorp.com/dew-3.0'));
    assert.ok(!dew.includes('github.com/freshworks/fw-dew'));
    assert.ok(/Do not.*DewTheme|not a React component/i.test(dew), 'must warn against DewTheme JSX wrapper');
  });

  test('react-meta-patterns.mdc exists', async () => {
    assert.ok(await fileExists(join(SKILLS_DIR, 'fw-app-dev', 'rules', 'react-meta-patterns.mdc')));
  });

  test('react-meta custom-iparams skeleton and docs', async () => {
    const base = join(TEMPLATES_DIR, 'react-meta-custom-iparams-skeleton');
    const html = await readFile(join(base, 'config', 'iparams.html'), 'utf8');
    assert.ok(html.includes('id="root"'));
    assert.ok(html.includes('{{{appclient}}}'));
    assert.ok(await fileExists(join(base, 'config', 'assets', 'components', 'main.jsx')));
    assert.ok(await fileExists(join(base, 'config', 'assets', 'components', 'mount.jsx')));
    assert.ok(await fileExists(join(base, 'config', 'assets', 'components', 'IparamsForm.jsx')));
    const form = await readFile(join(base, 'config', 'assets', 'components', 'IparamsForm.jsx'), 'utf8');
    assert.ok(form.includes('window.getConfigs'));
    assert.ok(form.includes('window.postConfigs'));
    assert.ok(form.includes('window.validate'));
    assert.ok(form.includes('formRef.current'));
    assert.ok(form.includes('@freshworks/dew-components'));
    const main = await readFile(join(base, 'config', 'assets', 'components', 'main.jsx'), 'utf8');
    assert.ok(main.includes('./mount'));
    const iparamsMount = await readFile(join(base, 'config', 'assets', 'components', 'mount.jsx'), 'utf8');
    assert.ok(iparamsMount.includes('ErrorBoundary'));
    assert.ok(iparamsMount.includes('ErrorFallback'));
    assert.ok(iparamsMount.includes('mountIparams'));
    assert.ok(await fileExists(join(base, 'config', 'assets', 'components', 'ErrorFallback.jsx')));
    assert.ok(!form.includes('@freshworks/crayons'));
    const doc = await readRepo('skills/fw-app-dev/references/react-meta/custom-iparams.md');
    assert.ok(doc.includes('config/iparams.html'));
    assert.ok(doc.includes('react-meta-custom-iparams-skeleton'));
    assert.ok(doc.includes('react-error-boundary'));
  });

  test('plugin.json registers react commands', async () => {
    const plugin = await readJson('skills/fw-app-dev/.cursor-plugin/plugin.json');
    const names = plugin.commands.map(c => c.name);
    assert.equal(names.length, 5, `expected 5 commands, got: ${names.join(', ')}`);
    assert.ok(names.includes('fdk-react-create'));
    assert.ok(names.includes('fdk-react-migrate'));
  });

  test('command files exist for fdk-react-create and fdk-react-migrate', async () => {
    assert.ok(await fileExists(join(SKILLS_DIR, 'fw-app-dev', 'commands', 'fdk-react-create.md')));
    assert.ok(await fileExists(join(SKILLS_DIR, 'fw-app-dev', 'commands', 'fdk-react-migrate.md')));
  });

  test('react commands write react_meta_workflow telemetry', async () => {
    const create = await readRepo('skills/fw-app-dev/commands/fdk-react-create.md');
    const migrate = await readRepo('skills/fw-app-dev/commands/fdk-react-migrate.md');
    assert.ok(create.includes('react_meta_workflow=react-create'));
    assert.ok(migrate.includes('react_meta_workflow=react-migrate'));
    assert.ok(create.includes('meta-init.sh <app-directory>'));
    assert.ok(!create.includes('meta-init.sh <app-directory> <ide-client>'));
    assert.ok(migrate.includes('meta-init.sh <app-directory>'));
    assert.ok(!migrate.includes('meta-init.sh <app-directory> <ide-client>'));
  });
});

// ---------------------------------------------------------------------------
// fw-publish: specific behavioral checks
// ---------------------------------------------------------------------------

describe('fw-publish SKILL.md', () => {
  test('contains feedback prompt step before fdk pack', async () => {
    const content = await readSkill('fw-publish');
    assert.ok(
      content.includes('4.5')
        && /developer-feedback-rating-prompt/i.test(content)
        && /developer-feedback-comment-prompt/i.test(content),
      'fw-publish must reference developer feedback templates before pack step'
    );
  });

  test('writes fw-publish metrics before fdk pack (step 4.6)', async () => {
    const content = await readSkill('fw-publish');
    const idx46 = content.indexOf('4.6');
    const idxPack = content.indexOf('### 5. fdk pack');
    assert.ok(idx46 !== -1 && idxPack !== -1, 'fw-publish must have step 4.6 before step 5');
    assert.ok(idx46 < idxPack, 'step 4.6 must appear before fdk pack');
    assert.ok(
      content.includes('meta-update.sh') && /before.*fdk pack|before step 5/i.test(content),
      'fw-publish must write metrics before fdk pack'
    );
  });

  test('specifies publish_outcome failure values', async () => {
    const content = await readSkill('fw-publish');
    for (const outcome of ['failed_validate', 'failed_upload', 'failed_submit']) {
      assert.ok(content.includes(outcome), `fw-publish must define publish_outcome: "${outcome}"`);
    }
  });

  test('deletes .meta.json on success, keeps on failure', async () => {
    const content = await readSkill('fw-publish');
    assert.ok(content.includes('delete'), 'fw-publish must instruct to delete .meta.json on success');
    assert.ok(
      content.includes('keep') || content.includes('intact'),
      'fw-publish must instruct to keep .meta.json on failure'
    );
  });

  test('zip layout gate requires .meta.json in upload package', async () => {
    const content = await readSkill('fw-publish');
    assert.ok(
      /Pass — metrics/i.test(content) && /\.meta\.json/.test(content) && /unzip -l/i.test(content),
      'fw-publish zip gate must require .meta.json in unzip -l listing'
    );
    assert.ok(
      content.includes('4.6') && content.includes('step 5'),
      'zip metrics gate must reference pre-pack metrics step 4.6'
    );
  });
});

// ---------------------------------------------------------------------------
// fw-review: specific behavioral checks
// ---------------------------------------------------------------------------

describe('fw-review SKILL.md', () => {
  test('MANDATORY .meta.json section gates emission of App Review Result', async () => {
    const content = await readSkill('fw-review');
    const mandatoryIdx = content.indexOf('MANDATORY: .meta.json write');
    assert.ok(mandatoryIdx !== -1, 'must have MANDATORY .meta.json write section');
    const hasGate =
      content.includes('before outputting') ||
      content.includes('before emitting') ||
      content.includes('DO NOT emit App Review Result');
    assert.ok(hasGate, 'MANDATORY section must gate App Review Result emission on .meta.json write');
  });
});

// ---------------------------------------------------------------------------
// fw-setup: read-only commands must not write .meta.json
// ---------------------------------------------------------------------------

describe('fw-setup read-only gate', () => {
  test('status and use commands are explicitly excluded from .meta.json writes', async () => {
    const content = await readSkill('fw-setup');
    const hasReadOnlyExclusion =
      (content.includes('fw-setup-status') || content.includes('/fw-setup-status')) &&
      (content.includes('Read-only') || content.includes('read-only') || content.includes('do not write') || content.includes('Skip only'));
    assert.ok(hasReadOnlyExclusion, 'fw-setup must exclude read-only commands from .meta.json writes');
  });
});

// ===========================================================================
// PR #21 — structural tests derived from the PR test plan
// ===========================================================================

const REPO_DIR = join(__dirname, '..', '..');

async function fileExists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function readRepo(relPath) {
  return readFile(join(REPO_DIR, relPath), 'utf8');
}

async function readJson(relPath) {
  return JSON.parse(await readRepo(relPath));
}

// ---------------------------------------------------------------------------
// CHANGE 1 — /fdk-review removal: no dangling references
// ---------------------------------------------------------------------------

describe('PR#21 — fdk-review removal', () => {
  test('1.1: no skill or plugin file references fdk-review command', async () => {
    const hits = await grepFiles(REPO_DIR, 'fdk-review', { skipDirs: ['docs', 'tests'] });
    assert.deepEqual(hits, [], `fdk-review still referenced in:\n${hits.join('\n')}`);
  });

  test('1.2: fw-app-dev plugin.json has fdk-fix, fdk-migrate, fdk-refactor commands', async () => {
    const plugin = await readJson('skills/fw-app-dev/.cursor-plugin/plugin.json');
    const names = plugin.commands.map(c => c.name);
    assert.ok(names.includes('fdk-fix'));
    assert.ok(names.includes('fdk-migrate'));
    assert.ok(names.includes('fdk-refactor'));
    assert.ok(!names.includes('fdk-review'), 'fdk-review must not be in commands');
  });

  test('1.3: fw-app-dev SKILL.md argument-hint has no fdk-review', async () => {
    const content = await readSkill('fw-app-dev');
    const line = content.split('\n').find(l => l.startsWith('argument-hint:'));
    assert.ok(line, 'argument-hint field must exist');
    assert.ok(!line.includes('fdk-review'), 'argument-hint must not reference fdk-review');
    assert.ok(line.includes('fdk-fix') && line.includes('fdk-migrate') && line.includes('fdk-refactor'));
  });

  test('1.4: plugin manifests do not mention /fdk-review', async () => {
    const claude = await readRepo('.claude-plugin/marketplace.json');
    const cursor = await readRepo('.cursor-plugin/marketplace.json');
    assert.ok(!claude.includes('fdk-review'), '.claude-plugin/marketplace.json must not mention fdk-review');
    assert.ok(!cursor.includes('fdk-review'), '.cursor-plugin/marketplace.json must not mention fdk-review');
  });
});

// ---------------------------------------------------------------------------
// CHANGE 2 — fw-app-dev reference files exist and have correct content
// ---------------------------------------------------------------------------

describe('PR#21 — fw-app-dev reference files', () => {
  const FW_APP_REF = 'skills/fw-app-dev/references';

  const REQUIRED_FILES = [
    `${FW_APP_REF}/examples/handler-patterns.md`,
    `${FW_APP_REF}/examples/complexity-reduction-pattern.js`,
    `${FW_APP_REF}/examples/mcp-availability-check.md`,
    `${FW_APP_REF}/examples/request-manifest-sync.md`,
    `${FW_APP_REF}/templates/app-readme-template.md`,
    `${FW_APP_REF}/templates/crayons-cdn.html`,
    `${FW_APP_REF}/templates/frontend-app-tree.txt`,
    `${FW_APP_REF}/templates/last-resort-warning.txt`,
    `${FW_APP_REF}/templates/manifest-3.0.json`,
    `${FW_APP_REF}/templates/mcp-config-prompt.txt`,
    `${FW_APP_REF}/templates/post-generation-message.txt`,
    `${FW_APP_REF}/templates/serverless-app-tree.txt`,
    `${FW_APP_REF}/templates/validation-success.txt`,
  ];

  for (const f of REQUIRED_FILES) {
    test(`2.x: ${f.replace('skills/fw-app-dev/references/', '')} exists`, async () => {
      assert.ok(await fileExists(join(REPO_DIR, f)), `missing: ${f}`);
    });
  }

  test('2.x: manifest-3.0.json is valid JSON with platform-version 3.0 and no tracking fields in app', async () => {
    const m = await readJson(`${FW_APP_REF}/templates/manifest-3.0.json`);
    assert.equal(m['platform-version'], '3.0');
    assert.ok(m.modules, 'must have modules');
    assert.ok(!Object.hasOwn(m.app ?? {}, 'tracking_id'), 'manifest-3.0.json app block must not have tracking_id');
    assert.ok(!Object.hasOwn(m.app ?? {}, 'start_time'), 'manifest-3.0.json app block must not have start_time');
    assert.equal(m.engines?.node, '24.11.0');
    assert.equal(m.engines?.fdk, '10.0.1');
  });

  test('2.x: crayons-cdn.html has both esm and nomodule script tags with correct CDN URL', async () => {
    const html = await readRepo(`${FW_APP_REF}/templates/crayons-cdn.html`);
    assert.ok(html.includes('type="module"'), 'must have ESM script tag');
    assert.ok(html.includes('nomodule'), 'must have nomodule fallback');
    assert.ok(html.includes('cdn.jsdelivr.net/npm/@freshworks/crayons@v4'), 'must use correct Crayons CDN');
  });

  test('2.x: last-resort-warning.txt contains DEPRECATED TOOLCHAIN and FDK 9.8.2', async () => {
    const txt = await readRepo(`${FW_APP_REF}/templates/last-resort-warning.txt`);
    assert.ok(txt.includes('DEPRECATED TOOLCHAIN'));
    assert.ok(txt.includes('FDK 9.8.2'));
    assert.ok(txt.includes('Node 18.20.8'));
  });

  test('2.x: handler-patterns.md contains INVALID and VALID async/await examples', async () => {
    const md = await readRepo(`${FW_APP_REF}/examples/handler-patterns.md`);
    assert.ok(md.includes('INVALID') || md.includes('invalid'), 'must show invalid pattern');
    assert.ok(md.includes('VALID') || md.includes('valid'), 'must show valid pattern');
    assert.ok(md.includes('async') && md.includes('await'), 'must cover async/await pattern');
  });

  test('2.x: complexity-reduction-pattern.js contains Set.has() approach', async () => {
    const js = await readRepo(`${FW_APP_REF}/examples/complexity-reduction-pattern.js`);
    assert.ok(js.includes('Set') || js.includes('.has('), 'must show Set-based complexity reduction');
  });

  test('2.x: app-readme-template.md has required sections', async () => {
    const md = await readRepo(`${FW_APP_REF}/templates/app-readme-template.md`);
    assert.ok(md.includes('## Features'));
    assert.ok(md.includes('## Setup'));
    assert.ok(md.includes('## Usage'));
  });

  test('2.x: frontend-app-tree.txt references icon.svg and iparams.json', async () => {
    const txt = await readRepo(`${FW_APP_REF}/templates/frontend-app-tree.txt`);
    assert.ok(txt.includes('icon.svg'));
    assert.ok(txt.includes('iparams.json'));
    assert.ok(txt.includes('index.html'));
  });

  test('2.x: mcp-availability-check.md references fw-dev-mcp and list_custom_apps', async () => {
    const md = await readRepo(`${FW_APP_REF}/examples/mcp-availability-check.md`);
    assert.ok(md.includes('fw-dev-mcp'));
    assert.ok(md.includes('list_custom_apps'));
  });

  test('2.x: SKILL.md links resolve to real files (13 reference links)', async () => {
    const content = await readSkill('fw-app-dev');
    const linkRe = /\[.*?\]\((references\/[^)]+)\)/g;
    const matches = [...content.matchAll(linkRe)].map(m => m[1]);
    const unique = [...new Set(matches)];
    const missing = [];
    for (const rel of unique) {
      const full = join(REPO_DIR, 'skills', 'fw-app-dev', rel);
      if (!(await fileExists(full))) missing.push(rel);
    }
    assert.deepEqual(missing, [], `broken links in fw-app-dev/SKILL.md: ${missing.join(', ')}`);
  });
});

// ---------------------------------------------------------------------------
// CHANGE 3 — fw-publish reference files
// ---------------------------------------------------------------------------

describe('PR#21 — fw-publish reference files', () => {
  const FW_PUB_REF = 'skills/fw-publish/references';

  const REQUIRED_FILES = [
    `${FW_PUB_REF}/openai-server-mcp-tools.md`,
    `${FW_PUB_REF}/deprecated-mcp-build-tools.md`,
    `${FW_PUB_REF}/templates/claude-mcp-setup.json`,
    `${FW_PUB_REF}/templates/cursor-mcp-setup.json`,
    `${FW_PUB_REF}/templates/custom-app-limit-warning.txt`,
    `${FW_PUB_REF}/templates/developer-feedback-comment-prompt.txt`,
    `${FW_PUB_REF}/templates/developer-feedback-rating-prompt.txt`,
    `${FW_PUB_REF}/templates/downgrade-warning.txt`,
    `${FW_PUB_REF}/templates/engines-mismatch-prompt.txt`,
    `${FW_PUB_REF}/templates/stuck-version-warning.txt`,
  ];

  for (const f of REQUIRED_FILES) {
    test(`3.x: ${f.replace('skills/fw-publish/references/', '')} exists`, async () => {
      assert.ok(await fileExists(join(REPO_DIR, f)), `missing: ${f}`);
    });
  }

  test('3.x: claude-mcp-setup.json and cursor-mcp-setup.json are valid JSON with fw-dev-mcp', async () => {
    for (const f of ['claude-mcp-setup.json', 'cursor-mcp-setup.json']) {
      const j = await readJson(`${FW_PUB_REF}/templates/${f}`);
      assert.equal(j.mcpServers?.['fw-dev-mcp']?.url, 'https://mcp.freshworks.dev/mcp', `${f}: wrong MCP URL`);
      assert.ok(j.mcpServers['fw-dev-mcp'].headers?.Authorization?.startsWith('Bearer '), `${f}: missing Authorization header`);
    }
  });

  test('3.x: developer-feedback-rating-prompt.txt has Liked/Skip options', async () => {
    const txt = await readRepo(`${FW_PUB_REF}/templates/developer-feedback-rating-prompt.txt`);
    assert.ok(txt.includes('Liked it'), 'rating prompt must include Liked option');
    assert.ok(txt.includes('Skip'), 'rating prompt must include Skip option');
  });

  test('3.x: developer-feedback-comment-prompt.txt invites optional comment', async () => {
    const txt = await readRepo(`${FW_PUB_REF}/templates/developer-feedback-comment-prompt.txt`);
    assert.ok(txt.includes('press Enter to skip'), 'comment prompt must allow skip');
  });

  test('3.x: custom-app-limit-warning.txt mentions 25 app limit', async () => {
    const txt = await readRepo(`${FW_PUB_REF}/templates/custom-app-limit-warning.txt`);
    assert.ok(txt.includes('25'), 'must mention 25 app limit');
    assert.ok(txt.includes('developers.freshworks.com'), 'must link to developer portal');
  });

  test('3.x: stuck-version-warning.txt mentions development state and remediation', async () => {
    const txt = await readRepo(`${FW_PUB_REF}/templates/stuck-version-warning.txt`);
    assert.ok(txt.includes('development') || txt.includes('stuck'));
    assert.ok(txt.includes('developers.freshworks.com'), 'must have portal link');
  });

  test('3.x: downgrade-warning.txt mentions ai_actions and yes/no prompt', async () => {
    const txt = await readRepo(`${FW_PUB_REF}/templates/downgrade-warning.txt`);
    assert.ok(txt.includes('ai_actions'));
    assert.ok(txt.includes('yes/no') || txt.includes('(yes/no)'));
  });

  test('3.x: engines-mismatch-prompt.txt has version placeholders and fw-setup commands', async () => {
    const txt = await readRepo(`${FW_PUB_REF}/templates/engines-mismatch-prompt.txt`);
    assert.ok(txt.includes('fw-setup') || txt.includes('/fw-setup-'));
    assert.ok(txt.includes('yes') || txt.includes('y/n') || txt.includes('yes/no'));
  });

  test('3.x: openai-server-mcp-tools.md documents all 7 MCP tools', async () => {
    const md = await readRepo(`${FW_PUB_REF}/openai-server-mcp-tools.md`);
    for (const tool of ['list_custom_apps', 'create_app_upload_url', 'submit_custom_app', 'add_app_version', 'list_app_versions', 'get_app_status', 'get_developer_docs']) {
      assert.ok(md.includes(tool), `openai-server-mcp-tools.md missing tool: ${tool}`);
    }
  });

  test('3.x: openai-server-mcp-tools.md marks get_developer_docs as primary', async () => {
    const md = await readRepo(`${FW_PUB_REF}/openai-server-mcp-tools.md`);
    const lower = md.toLowerCase();
    assert.ok(lower.includes('primary'), 'get_developer_docs must be marked as primary');
  });

  test('3.x: deprecated-mcp-build-tools.md documents deprecation contract for legacy build tools', async () => {
    const md = await readRepo(`${FW_PUB_REF}/deprecated-mcp-build-tools.md`);
    for (const tool of ['implement_app', 'get_implementation_plan', 'idea_to_app', 'fix_app_errors']) {
      assert.ok(md.includes(tool), `deprecated-mcp-build-tools.md missing tool: ${tool}`);
    }
    assert.ok(md.includes('"deprecated": true'), 'must document deprecation contract shape');
    assert.ok(md.includes('fw-app-dev'), 'must redirect to fw-app-dev');
  });

  test('3.x: fw-publish SKILL.md links all resolve to real files', async () => {
    const content = await readSkill('fw-publish');
    const linkRe = /\[.*?\]\((references\/[^)]+)\)/g;
    const matches = [...content.matchAll(linkRe)].map(m => m[1]);
    const unique = [...new Set(matches)];
    const missing = [];
    for (const rel of unique) {
      const full = join(REPO_DIR, 'skills', 'fw-publish', rel);
      if (!(await fileExists(full))) missing.push(rel);
    }
    assert.deepEqual(missing, [], `broken links in fw-publish/SKILL.md: ${missing.join(', ')}`);
  });
});

// ---------------------------------------------------------------------------
// CHANGE 4 — fw-setup reference files and scripts
// ---------------------------------------------------------------------------

describe('PR#21 — fw-setup reference files and scripts', () => {
  test('4.1: fdk9-deprecation-warning.txt mentions DEPRECATED and May 31, 2026', async () => {
    const txt = await readRepo('skills/fw-setup/references/templates/fdk9-deprecation-warning.txt');
    assert.ok(txt.includes('DEPRECATED') || txt.includes('deprecated'));
    assert.ok(txt.includes('2026'), 'must mention deprecation year');
    assert.ok(txt.includes('y/N') || txt.includes('y/n') || txt.includes('Continue'), 'must have consent prompt');
  });

  test('4.2: cursor-mcp-config.json is valid JSON with fw-dev-mcp URL', async () => {
    const j = await readJson('skills/fw-setup/references/templates/cursor-mcp-config.json');
    assert.equal(j.mcpServers?.['fw-dev-mcp']?.url, 'https://mcp.freshworks.dev/mcp');
  });

  test('4.3: fw-setup-quick-detect.sh has execute bit set', async () => {
    const s = await stat(join(REPO_DIR, 'skills/fw-setup/scripts/fw-setup-quick-detect.sh'));
    // eslint-disable-next-line no-bitwise
    assert.ok(s.mode & 0o111, 'fw-setup-quick-detect.sh must be executable');
  });
});

// ---------------------------------------------------------------------------
// CHANGE 5 — duplicate AI-actions skeleton removed
// ---------------------------------------------------------------------------

describe('PR#21 — AI-actions skeleton deduplication', () => {
  test('5.1: no file references scripts/ai-actions-skeleton', async () => {
    const hits = await grepFiles(REPO_DIR, 'scripts/ai-actions-skeleton', { skipDirs: ['tests'] });
    assert.deepEqual(hits, [], `scripts/ai-actions-skeleton still referenced in:\n${hits.join('\n')}`);
  });

  test('5.2: SKILL.md references only assets/templates/ai-actions-skeleton', async () => {
    const content = await readSkill('fw-ai-actions-app');
    assert.ok(content.includes('assets/templates/ai-actions-skeleton'), 'must reference assets/templates skeleton');
    assert.ok(!content.includes('scripts/ai-actions-skeleton'), 'must not reference scripts skeleton');
  });

  test('5.4: ai-actions-skeleton server.js has no syntax errors', () => {
    const serverPath = join(REPO_DIR, 'skills/fw-ai-actions-app/assets/templates/ai-actions-skeleton/server/server.js');
    assert.doesNotThrow(
      () => execSync(`node --check "${serverPath}"`, { encoding: 'utf8' }),
      'server.js must be valid JavaScript'
    );
  });

  test('5.5: ai-actions server.js uses renderData and invokeTemplate patterns', async () => {
    const js = await readFile(
      join(REPO_DIR, 'skills/fw-ai-actions-app/assets/templates/ai-actions-skeleton/server/server.js'),
      'utf8'
    );
    assert.ok(js.includes('renderData'), 'must use renderData');
    assert.ok(js.includes('invokeTemplate'), 'must use $request.invokeTemplate');
  });

  test('5.6: ai-actions-skeleton iparams.json is valid JSON', async () => {
    const j = await readJson('skills/fw-ai-actions-app/assets/templates/ai-actions-skeleton/config/iparams.json');
    assert.ok(typeof j === 'object' && j !== null);
  });
});

// ---------------------------------------------------------------------------
// CHANGE 7 — repack-app-zip.sh
// ---------------------------------------------------------------------------

describe('PR#21 — repack-app-zip.sh', () => {
  test('7.1: repack-app-zip.sh has execute bit set', async () => {
    const s = await stat(join(REPO_DIR, 'skills/fw-publish/scripts/repack-app-zip.sh'));
    // eslint-disable-next-line no-bitwise
    assert.ok(s.mode & 0o111, 'repack-app-zip.sh must be executable');
  });

  test('7.3: repack-app-zip.sh exits with error when called with no arguments', { skip: process.platform === 'win32' }, () => {
    const result = execSync(
      'bash skills/fw-publish/scripts/repack-app-zip.sh 2>&1; echo "EXIT:$?"',
      { cwd: REPO_DIR, encoding: 'utf8' }
    );
    assert.ok(result.includes('EXIT:1') || result.includes('Usage') || result.includes('usage') || result.includes('required'),
      'script must exit non-zero or print usage when called with no args');
  });

  test('7.4: repack-app-zip.sh member list includes .meta.json', async () => {
    const { readFile } = await import('node:fs/promises');
    const src = await readFile(join(REPO_DIR, 'skills/fw-publish/scripts/repack-app-zip.sh'), 'utf8');
    assert.match(src, /manifest\.json.*\.meta\.json|\.meta\.json.*manifest\.json/s,
      'repack-app-zip.sh must pack .meta.json with manifest.json');
  });
});

// ---------------------------------------------------------------------------
// CHANGE 9 — AGENTS.md subagents reference removed
// ---------------------------------------------------------------------------

describe('PR#21 — AGENTS.md subagents cleanup', () => {
  test('9.1: AGENTS.md has no layout reference to fw-publish/subagents', async () => {
    const content = await readRepo('AGENTS.md');
    assert.ok(!content.includes('subagents/mcp-config-prompt'), 'AGENTS.md must not reference deleted subagents path');
  });

  test('9.2: no file references subagents/mcp-config-prompt', async () => {
    const hits = await grepFiles(REPO_DIR, 'subagents/mcp-config-prompt', { skipDirs: ['tests'] });
    assert.deepEqual(hits, [], `subagents/mcp-config-prompt still referenced in:\n${hits.join('\n')}`);
  });
});

// ---------------------------------------------------------------------------
// CHANGE 10 — Plugin version consistency and JSON validity
// ---------------------------------------------------------------------------

describe('PR#21 — plugin manifest consistency', () => {
  test('10.1: .claude-plugin and .cursor-plugin have matching versions', async () => {
    const claude = await readJson('.claude-plugin/marketplace.json');
    const cursor = await readJson('.cursor-plugin/marketplace.json');
    assert.equal(claude.version, cursor.version, 'plugin versions must match across claude and cursor manifests');
  });

  test('10.2: all plugin JSON files parse without error', async () => {
    const files = [
      '.claude-plugin/marketplace.json',
      '.cursor-plugin/marketplace.json',
      'skills/fw-app-dev/.cursor-plugin/plugin.json',
    ];
    for (const f of files) {
      const parsed = await readJson(f);
      assert.ok(parsed, `${f} must parse as valid JSON`);
    }
  });
});

// ---------------------------------------------------------------------------
// CHANGE 11 — Internal link integrity
// ---------------------------------------------------------------------------

describe('PR#21 — internal link integrity', () => {
  test('11.2: fw-publish SKILL.md template links all resolve', async () => {
    const files = [
      'skills/fw-publish/references/templates/cursor-mcp-setup.json',
      'skills/fw-publish/references/templates/claude-mcp-setup.json',
      'skills/fw-publish/references/templates/engines-mismatch-prompt.txt',
      'skills/fw-publish/references/templates/custom-app-limit-warning.txt',
      'skills/fw-publish/references/templates/developer-feedback-comment-prompt.txt',
      'skills/fw-publish/references/templates/developer-feedback-rating-prompt.txt',
      'skills/fw-publish/references/templates/stuck-version-warning.txt',
      'skills/fw-publish/references/templates/downgrade-warning.txt',
    ];
    for (const f of files) {
      assert.ok(await fileExists(join(REPO_DIR, f)), `missing linked file: ${f}`);
    }
  });

  test('11.3: fw-setup SKILL.md reference links all resolve', async () => {
    const files = [
      'skills/fw-setup/references/templates/fdk9-deprecation-warning.txt',
      'skills/fw-setup/references/templates/cursor-mcp-config.json',
      'skills/fw-setup/commands/fw-setup-install.md',
    ];
    for (const f of files) {
      assert.ok(await fileExists(join(REPO_DIR, f)), `missing linked file: ${f}`);
    }
  });

  test('11.x: fw-setup SKILL.md links resolve to real files', async () => {
    const content = await readSkill('fw-setup');
    const linkRe = /\[.*?\]\(((?:references|commands|scripts)\/[^)]+)\)/g;
    const matches = [...content.matchAll(linkRe)].map(m => m[1]);
    const unique = [...new Set(matches)];
    const missing = [];
    for (const rel of unique) {
      const full = join(REPO_DIR, 'skills', 'fw-setup', rel);
      if (!(await fileExists(full))) missing.push(rel);
    }
    assert.deepEqual(missing, [], `broken links in fw-setup/SKILL.md: ${missing.join(', ')}`);
  });
});

// ---------------------------------------------------------------------------
// Shared scripts — existence and execute bits
// ---------------------------------------------------------------------------

describe('skills/shared/scripts', () => {
  const SCRIPTS = ['meta-init.sh', 'meta-update.sh', 'meta-feedback.sh', 'meta-delete.sh', 'check-update.sh'];
  const SCRIPTS_DIR = join(REPO_DIR, 'skills', 'shared', 'scripts');

  for (const script of SCRIPTS) {
    test(`${script}: exists`, async () => {
      assert.ok(await fileExists(join(SCRIPTS_DIR, script)), `missing: skills/shared/scripts/${script}`);
    });

    test(`${script}: has execute bit set`, { skip: process.platform === 'win32' }, async () => {
      const s = await stat(join(SCRIPTS_DIR, script));
      // eslint-disable-next-line no-bitwise
      assert.ok(s.mode & 0o111, `${script} must be executable`);
    });
  }

  test('.meta.template.json exists in scripts dir', async () => {
    assert.ok(
      await fileExists(join(SCRIPTS_DIR, '.meta.template.json')),
      'missing: skills/shared/scripts/.meta.template.json'
    );
  });

  test('.meta.template.json in scripts dir is valid JSON', async () => {
    const raw = await readFile(join(SCRIPTS_DIR, '.meta.template.json'), 'utf8');
    const t = JSON.parse(raw);
    assert.ok(t, 'must parse as valid JSON');
    assert.equal(t.source, 'ai_skills');
  });
});

// ---------------------------------------------------------------------------
// fw-publish: meta-delete.sh usage
// ---------------------------------------------------------------------------

describe('fw-publish meta-delete.sh', () => {
  test('references meta-delete.sh for success cleanup', async () => {
    const content = await readSkill('fw-publish');
    assert.ok(
      content.includes('meta-delete.sh'),
      'fw-publish must reference meta-delete.sh for post-publish cleanup'
    );
  });

  test('references meta-feedback.sh for developer feedback step', async () => {
    const content = await readSkill('fw-publish');
    assert.ok(
      content.includes('meta-feedback.sh') && content.includes('developer_feedback'),
      'fw-publish must reference meta-feedback.sh and developer_feedback key for step 4.5'
    );
  });
});

// ---------------------------------------------------------------------------
// fw-review rules directory
// ---------------------------------------------------------------------------

describe('fw-review rules directory', () => {
  const RULES_DIR = join(SKILLS_DIR, 'fw-review', 'rules');
  const RULE_FILES = [
    'iparam-rules.md',
    'frontend-files-rules.md',
    'script-check-rules.md',
    'report.md',
  ];

  for (const f of RULE_FILES) {
    test(`rules/${f} exists`, async () => {
      assert.ok(
        await fileExists(join(RULES_DIR, f)),
        `missing: skills/fw-review/rules/${f}`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// fw-review scripts exist
// ---------------------------------------------------------------------------

describe('fw-review scripts exist', () => {
  const FW_REVIEW_SCRIPTS = join(SKILLS_DIR, 'fw-review', 'scripts');

  test('skills/fw-review/scripts/ directory exists', async () => {
    assert.ok(
      await fileExists(FW_REVIEW_SCRIPTS),
      'missing: skills/fw-review/scripts/'
    );
  });

  test('skills/fw-review/scripts/ contains at least one .js file', async () => {
    let entries;
    try {
      entries = await readdir(FW_REVIEW_SCRIPTS, { withFileTypes: true });
    } catch {
      assert.fail('skills/fw-review/scripts/ directory could not be read');
    }
    const jsFiles = entries.filter(e => e.isFile() && extname(e.name) === '.js');
    assert.ok(jsFiles.length >= 1, 'skills/fw-review/scripts/ must contain at least one .js file');
  });
});

// ---------------------------------------------------------------------------
// fw-setup commands exist
// ---------------------------------------------------------------------------

describe('fw-setup commands exist', () => {
  const FW_SETUP_COMMANDS = join(SKILLS_DIR, 'fw-setup', 'commands');

  test('skills/fw-setup/commands/ directory exists', async () => {
    assert.ok(
      await fileExists(FW_SETUP_COMMANDS),
      'missing: skills/fw-setup/commands/'
    );
  });

  test('skills/fw-setup/commands/ contains at least one .md file', async () => {
    let entries;
    try {
      entries = await readdir(FW_SETUP_COMMANDS, { withFileTypes: true });
    } catch {
      assert.fail('skills/fw-setup/commands/ directory could not be read');
    }
    const mdFiles = entries.filter(e => e.isFile() && extname(e.name) === '.md');
    assert.ok(mdFiles.length >= 1, 'skills/fw-setup/commands/ must contain at least one .md file');
  });
});

// ---------------------------------------------------------------------------
// fw-setup docs/engine-matrix.md
// ---------------------------------------------------------------------------

describe('fw-setup docs/engine-matrix.md', () => {
  const ENGINE_MATRIX = join(SKILLS_DIR, 'fw-setup', 'docs', 'engine-matrix.md');

  test('engine-matrix.md exists and contains FDK 10 and 24.11 (or is optional)', async () => {
    const exists = await fileExists(ENGINE_MATRIX);
    if (!exists) {
      assert.ok(true, 'engine-matrix.md not present (optional)');
      return;
    }
    const content = await readFile(ENGINE_MATRIX, 'utf8');
    assert.ok(content.includes('FDK 10'), 'engine-matrix.md must contain "FDK 10"');
    assert.ok(content.includes('24.11'), 'engine-matrix.md must contain "24.11"');
  });
});

// ---------------------------------------------------------------------------
// fw-ai-actions-app actions.json template
// ---------------------------------------------------------------------------

describe('fw-ai-actions-app actions.json template', () => {
  const ACTIONS_JSON = join(
    SKILLS_DIR,
    'fw-ai-actions-app',
    'assets',
    'templates',
    'ai-actions-skeleton',
    'actions.json'
  );

  test('actions.json exists', async () => {
    assert.ok(await fileExists(ACTIONS_JSON), 'missing: skills/fw-ai-actions-app/assets/templates/ai-actions-skeleton/config/actions.json');
  });

  test('actions.json is valid JSON', async () => {
    const raw = await readFile(ACTIONS_JSON, 'utf8');
    const parsed = JSON.parse(raw);
    assert.ok(parsed !== null && parsed !== undefined, 'actions.json must parse as valid JSON');
  });

  test('actions.json has at least 1 action or non-empty object structure', async () => {
    const raw = await readFile(ACTIONS_JSON, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      assert.ok(parsed.length >= 1, 'actions.json array must have at least 1 action');
    } else {
      assert.ok(Object.keys(parsed).length >= 1, 'actions.json object must have at least 1 key');
    }
  });
});

// ---------------------------------------------------------------------------
// fw-ai-actions-app forbidden patterns in skeleton
// ---------------------------------------------------------------------------

describe('fw-ai-actions-app forbidden patterns in skeleton', () => {
  const SKELETON_DIR = join(
    SKILLS_DIR,
    'fw-ai-actions-app',
    'assets',
    'templates',
    'ai-actions-skeleton'
  );

  test('skeleton does not use $request.post( (must use $request.invokeTemplate)', async () => {
    const hits = await grepFiles(SKELETON_DIR, '$request.post(');
    assert.deepEqual(
      hits,
      [],
      `$request.post( found in skeleton files (must use $request.invokeTemplate):\n${hits.join('\n')}`
    );
  });
});

// ---------------------------------------------------------------------------
// fw-review SKILL.md rule IDs match rule files
// ---------------------------------------------------------------------------

describe('fw-review SKILL.md rule IDs match rule files', () => {
  test('SKILL.md contains required rule categories', async () => {
    const content = await readSkill('fw-review');
    for (const category of ['iparams', 'File and folder structure', 'Frontend', 'Code readability', 'Miscellaneous']) {
      assert.ok(content.includes(category), `fw-review SKILL.md must contain category: "${category}"`);
    }
  });

  test('SKILL.md contains all required rule IDs', async () => {
    const content = await readSkill('fw-review');
    for (const ruleId of ['IP-04A', 'IP-05A', 'IP-06A', 'FF-01L', 'FF-03A', 'FF-08A', 'FFS-02L', 'GN-02L']) {
      assert.ok(content.includes(ruleId), `fw-review SKILL.md must contain rule ID: ${ruleId}`);
    }
  });
});

// ---------------------------------------------------------------------------
// fw-publish SKILL.md CDN tarball references
// ---------------------------------------------------------------------------

describe('fw-publish SKILL.md CDN tarball references', () => {
  test('fw-setup SKILL.md contains latest-v24.tgz (FDK 10 CDN)', async () => {
    const content = await readSkill('fw-setup');
    assert.ok(content.includes('latest-v24.tgz'), 'fw-setup SKILL.md must reference latest-v24.tgz for FDK 10 CDN');
  });

  test('fw-setup SKILL.md contains latest.tgz (FDK 9 CDN)', async () => {
    const content = await readSkill('fw-setup');
    assert.ok(content.includes('latest.tgz'), 'fw-setup SKILL.md must reference latest.tgz for FDK 9 CDN');
  });

});

describe('fw-ai-actions-app skeleton has test_data directory', async () => {
  const skeletonDir = join(SKILLS_DIR, 'fw-ai-actions-app', 'skeleton');
  let skeletonExists = false;
  try {
    await readFile(join(skeletonDir, 'manifest.json'), 'utf8');
    skeletonExists = true;
  } catch {
    // skip if no skeleton
  }
  if (!skeletonExists) return;

  test('test_data directory exists in skeleton', async () => {
    const dirs = await readdir(skeletonDir, { withFileTypes: true });
    const hasTestData = dirs.some(d => d.isDirectory() && d.name === 'test_data');
    assert.ok(hasTestData, 'fw-ai-actions-app skeleton must include test_data/ directory');
  });
});

describe('fw-setup SKILL.md workspace commands', async () => {
  const skillPath = join(SKILLS_DIR, 'fw-setup', 'SKILL.md');
  let content = '';
  try { content = await readFile(skillPath, 'utf8'); } catch { return; }

  test('SKILL.md documents workspace command or .nvmrc creation', async () => {
    const mentionsWorkspace = /workspace|.nvmrc/i.test(content);
    assert.ok(mentionsWorkspace, 'fw-setup SKILL.md must document workspace/.nvmrc usage');
  });
});

describe('fw-ai-actions-app SKILL.md documents test_data requirement', async () => {
  const skillPath = join(SKILLS_DIR, 'fw-ai-actions-app', 'SKILL.md');
  let content = '';
  try { content = await readFile(skillPath, 'utf8'); } catch { return; }

  test('SKILL.md mentions test_data', async () => {
    assert.ok(/test_data/i.test(content), 'fw-ai-actions SKILL.md must mention test_data directory');
  });
});

describe('fw-review SKILL.md documents GN-12L test data rule', async () => {
  const skillPath = join(SKILLS_DIR, 'fw-review', 'SKILL.md');
  let content = '';
  try { content = await readFile(skillPath, 'utf8'); } catch { return; }

  test('SKILL.md references GN-12L', async () => {
    assert.ok(/GN-12L/.test(content), 'fw-review SKILL.md must reference GN-12L (test data rule)');
  });
});
