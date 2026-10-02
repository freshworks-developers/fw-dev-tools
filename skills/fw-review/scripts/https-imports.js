'use strict';

const { createRuleResult, runCli, walkFiles } = require('./common');

const RULE_ID = 'FFS-04L';

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
