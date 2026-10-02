'use strict';

const fs = require('fs/promises');
const path = require('path');
const { createRuleResult, runCli } = require('../runners/common');

const RULE_ID = 'FFS-02L';

const IGNORED_DIRECTORIES = new Set([
  '.cache',
  '.cursor',
  '.fdk',
  '.git',
  '.next',
  'build',
  'coverage',
  'dist',
  'node_modules'
]);

// Host-level allowlist for external import URLs.
// This list indicates known delivery infrastructure only, not package-level safety.
const KNOWN_EXTERNAL_SOURCES = [
  'ajax.googleapis.com',
  'cdn.freshdev.io',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'code.jquery.com',
  'esm.sh',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'ga.jspm.io',
  'maxcdn.bootstrapcdn.com',
  'npm.jspm.io',
  'registry.npmjs.org',
  'stackpath.bootstrapcdn.com',
  'static.freshdev.io',
  'unpkg.com'
];

const KNOWN_NPM_PACKAGE_HOSTS = new Set([
  'cdn.jsdelivr.net',
  'esm.sh',
  'ga.jspm.io',
  'npm.jspm.io',
  'registry.npmjs.org',
  'unpkg.com'
]);

// Walk app text files with matching extensions across the whole app root so import-style URLs can be inspected.
async function walkFiles(rootDir, extensions) {
  const files = [];

  async function visit(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name) && !entry.name.startsWith('.')) {
          await visit(fullPath);
        }
        continue;
      }

      if (entry.isFile() && extensions.includes(path.extname(entry.name).toLowerCase())) {
        const content = await fs.readFile(fullPath, 'utf8').catch(() => null);
        if (content !== null) {
          files.push({
            relativePath: path.relative(rootDir, fullPath).split(path.sep).join('/'),
            content
          });
        }
      }
    }
  }

  await visit(rootDir);
  return files;
}

function extractHostname(urlValue) {
  try {
    return new URL(urlValue).hostname.toLowerCase();
  } catch {
    const match = urlValue.match(/^https?:\/\/([^/:?#]+)/i);
    return match ? match[1].toLowerCase() : null;
  }
}

async function readJson(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function addDependencyKeys(target, dependencies) {
  if (!dependencies || typeof dependencies !== 'object') {
    return;
  }

  for (const dependencyName of Object.keys(dependencies)) {
    target.add(dependencyName.toLowerCase());
  }
}

function collectDeclaredPackages(manifest, packageJson) {
  const declaredPackages = new Set();

  addDependencyKeys(declaredPackages, manifest?.dependencies);
  addDependencyKeys(declaredPackages, packageJson?.dependencies);
  addDependencyKeys(declaredPackages, packageJson?.devDependencies);
  addDependencyKeys(declaredPackages, packageJson?.peerDependencies);
  addDependencyKeys(declaredPackages, packageJson?.optionalDependencies);

  return declaredPackages;
}

function extractPackageNameFromSpecifier(specifier) {
  const decodedSpecifier = decodeURIComponent((specifier || '').trim());
  if (!decodedSpecifier) {
    return null;
  }

  let value = decodedSpecifier.replace(/^npm:/i, '');
  value = value.split('?')[0].split('#')[0];
  if (!value) {
    return null;
  }

  const segments = value.split('/').filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  if (segments[0].startsWith('@')) {
    if (segments.length < 2) {
      return null;
    }

    const packageName = segments[1].replace(/@[^/]+$/, '');
    return `${segments[0]}/${packageName}`.toLowerCase();
  }

  return segments[0].replace(/@[^/]+$/, '').toLowerCase();
}

function extractNpmPackageName(urlValue) {
  try {
    const parsedUrl = new URL(urlValue);
    const hostname = parsedUrl.hostname.toLowerCase();
    const pathname = parsedUrl.pathname || '';

    if (!KNOWN_NPM_PACKAGE_HOSTS.has(hostname)) {
      return null;
    }

    let specifier = null;

    if (hostname === 'cdn.jsdelivr.net' && pathname.startsWith('/npm/')) {
      specifier = pathname.slice('/npm/'.length);
    } else if (hostname === 'ga.jspm.io' && pathname.startsWith('/npm:')) {
      specifier = pathname.slice('/npm:'.length);
    } else if (hostname === 'registry.npmjs.org') {
      specifier = pathname.slice(1).split('/-/')[0];
    } else {
      specifier = pathname.replace(/^\/+/, '');
    }

    return extractPackageNameFromSpecifier(specifier);
  } catch {
    return null;
  }
}

function createDetail(file, message) {
  return { file, message };
}

function createResult(passed, summary, details = []) {
  return createRuleResult(RULE_ID, passed, summary, details);
}

async function run(targetDir) {
  const manifest = await readJson(path.join(targetDir, 'manifest.json'));
  const packageJson = await readJson(path.join(targetDir, 'package.json'));
  const declaredPackages = collectDeclaredPackages(manifest, packageJson);
  const files = await walkFiles(targetDir, ['.css', '.html', '.js', '.json', '.jsx', '.ts', '.tsx']);
  const details = [];
  const srcHrefPattern = /(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
  const cssPattern = /(?:url|@import)\s*\(\s*["']?(https?:\/\/[^"')]+)["']?\s*\)/gi;

  for (const file of files) {
    const urls = new Set();
    for (const pattern of [srcHrefPattern, cssPattern]) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(file.content)) !== null) {
        urls.add(match[1]);
      }
    }

    for (const urlValue of urls) {
      const hostname = extractHostname(urlValue);
      const isAllowlistedHost =
        hostname && KNOWN_EXTERNAL_SOURCES.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
      if (!isAllowlistedHost) {
        details.push(
          createDetail(
            file.relativePath,
            hostname
              ? `External import uses a non-allowlisted host: ${urlValue}`
              : `External import uses an invalid URL: ${urlValue}`
          )
        );
        continue;
      }

      const packageName = extractNpmPackageName(urlValue);
      if (packageName && declaredPackages.size > 0 && !declaredPackages.has(packageName)) {
        details.push(
          createDetail(
            file.relativePath,
            `External import uses npm package "${packageName}" from ${hostname}, but that package is not declared in manifest/package dependencies.`
          )
        );
      }
    }
  }

  return details.length === 0
    ? createResult(true, 'All external script and style imports resolve to allowlisted hosts.')
    : createResult(false, 'Some external script or style imports resolve to non-allowlisted hosts.', details);
}

module.exports = { run };

if (require.main === module) {
  runCli(run);
}
