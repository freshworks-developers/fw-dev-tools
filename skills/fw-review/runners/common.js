'use strict';

const path = require('path');

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
  runCli
};
