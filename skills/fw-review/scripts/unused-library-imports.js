'use strict';

const { createRuleResult, runCli, walkFiles } = require('./common');

const RULE_ID = 'CR-05L';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
          const line = file.content.slice(0, match.index).split('\n').length;
          details.push(
            createDetail(
              file.relativePath,
              `Imported library "${source}" does not appear to be used.`,
              line,
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
