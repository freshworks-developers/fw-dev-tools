'use strict';

const fs = require('fs/promises');
const path = require('path');

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

function createRuleResult(ruleId, passed, summary, details = []) {
  return {
    internal: {
      rule_id: ruleId,
      visibility: 'internal'
    },
    passed,
    summary,
    details
  };
}

async function runCli(run) {
  const targetDir = path.resolve(process.argv[2] || process.cwd());
  const result = await run(targetDir);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.passed ? 0 : 1;
}

module.exports = {
  createRuleResult,
  runCli,
  walkFiles
};
