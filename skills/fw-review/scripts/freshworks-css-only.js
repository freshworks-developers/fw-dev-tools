'use strict';

const { createRuleResult, runCli, walkFiles } = require('./common');

const RULE_ID = 'GN-08L';

const BLOCKED_FILES = [
  'freshdesk.css',
  'freshmarketer.css',
  'freshsales.css',
  'freshservice.css',
  'freshteam.css'
];

function createDetail(file, message) {
  return { file, message };
}

function createResult(passed, summary, details = []) {
  return createRuleResult(RULE_ID, passed, summary, details);
}

async function run(targetDir) {
  const files = await walkFiles(targetDir, ['.css', '.html']);
  const details = [];
  const linkPattern = /<link[^>]+href\s*=\s*["']([^"']+\.css)["']/gi;
  const importPattern = /@import\s+(?:url\()?\s*["']([^"']+\.css)["']/gi;

  for (const file of files) {
    for (const pattern of [linkPattern, importPattern]) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(file.content)) !== null) {
        const href = match[1].toLowerCase();
        if (BLOCKED_FILES.some((cssFile) => href.includes(cssFile))) {
          details.push(
            createDetail(
              file.relativePath,
              `Only Freshworks.css should be used here, but found ${match[1]}.`
            )
          );
        }
      }
    }
  }

  return details.length === 0
    ? createResult(true, 'Only Freshworks.css references were detected.')
    : createResult(false, 'Product-specific CSS files were detected.', details);
}

module.exports = { run };

if (require.main === module) {
  runCli(run);
}
