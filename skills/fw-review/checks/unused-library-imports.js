'use strict';

const fs = require('fs/promises');
const path = require('path');
const { createRuleResult, runCli } = require('../runners/common');

const RULE_ID = 'CR-05L';

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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Walk JS and TS source files across the app root so third-party imports can be compared against usage in the same file.
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

function createDetail(file, message, line, excerpt) {
  return { file, message, line, excerpt };
}

function createResult(passed, summary, details = []) {
  return createRuleResult(RULE_ID, passed, summary, details);
}

async function run(targetDir) {
  const files = await walkFiles(targetDir, ['.js', '.jsx', '.ts', '.tsx']);
  const details = [];

  for (const file of files) {
    const requirePattern = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    const importPattern = /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/g;

    for (const pattern of [requirePattern, importPattern]) {
      let match;
      while ((match = pattern.exec(file.content)) !== null) {
        const identifier = match[1];
        const source = match[2];
        if (source.startsWith('.')) {
          continue;
        }

        const usagePattern = new RegExp(`\\b${escapeRegExp(identifier)}\\b`, 'g');
        const usages = file.content.match(usagePattern) || [];
        if (usages.length <= 1) {
          details.push(
            createDetail(
              file.relativePath,
              `Imported library "${source}" does not appear to be used.`,
              undefined,
              match[0]
            )
          );
        }
      }
    }
  }

  return details.length === 0
    ? createResult(true, 'Imported third-party libraries appear to be used.')
    : createResult(false, 'Some imported third-party libraries do not appear to be used.', details);
}

module.exports = { run };

if (require.main === module) {
  runCli(run);
}
