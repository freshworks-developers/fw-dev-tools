'use strict';

const fs = require('fs/promises');
const path = require('path');
const { createRuleResult, runCli } = require('../runners/common');

const RULE_ID = 'FFS-04L';

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

// Walk app text files with matching extensions across the whole app root so insecure import URLs can be found.
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

function collectMatches(content, regex) {
  const matcher = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  const matches = [];
  let match;

  while ((match = matcher.exec(content)) !== null) {
    const line = content.slice(0, match.index).split('\n').length;
    const excerpt = (content.split('\n')[line - 1] || '').trim();
    matches.push({ line, excerpt });
  }

  return matches;
}

function createDetail(file, message, line, excerpt) {
  return { file, message, line, excerpt };
}

function createResult(passed, summary, details = []) {
  return createRuleResult(RULE_ID, passed, summary, details);
}

async function run(targetDir) {
  const files = await walkFiles(targetDir, ['.css', '.html', '.js', '.json', '.jsx', '.ts', '.tsx']);
  const details = [];
  const patterns = [
    /(?:src|href)\s*=\s*["']http:\/\/[^"']+/gi,
    /(?:url|@import)\s*\(\s*["']?http:\/\/[^"')]+/gi
  ];

  for (const file of files) {
    for (const pattern of patterns) {
      for (const hit of collectMatches(file.content, pattern)) {
        details.push(
          createDetail(
            file.relativePath,
            'Import URLs must use HTTPS instead of HTTP.',
            hit.line,
            hit.excerpt
          )
        );
      }
    }
  }

  return details.length === 0
    ? createResult(true, 'All external imports use HTTPS.')
    : createResult(false, 'Some external imports still use HTTP.', details);
}

module.exports = { run };

if (require.main === module) {
  runCli(run);
}
