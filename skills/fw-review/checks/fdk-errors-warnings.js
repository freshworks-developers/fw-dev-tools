'use strict';

const { spawn } = require('child_process');
const { createRuleResult, runCli } = require('../runners/common');

const RULE_ID = 'GN-02L';
const MAX_REPORTED_ISSUES = 10;
const FDK_VALIDATE_TIMEOUT_MS = 120000;

function createDetail(file, message) {
  return { file, message };
}

function createResult(passed, summary, details = []) {
  return createRuleResult(RULE_ID, passed, summary, details);
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, '');
}

function runFdkValidate(targetDir) {
  return new Promise((resolve) => {
    const child = spawn('fdk', ['validate'], {
      cwd: targetDir,
      shell: false
    });

    let stdout = '';
    let stderr = '';
    let completed = false;

    const timeout = setTimeout(() => {
      if (!completed) {
        completed = true;
        child.kill('SIGTERM');
        resolve({
          exitCode: null,
          stdout,
          stderr,
          timedOut: true,
          error: null
        });
      }
    }, FDK_VALIDATE_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      if (!completed) {
        completed = true;
        clearTimeout(timeout);
        resolve({
          exitCode: null,
          stdout,
          stderr,
          timedOut: false,
          error
        });
      }
    });

    child.on('close', (exitCode) => {
      if (!completed) {
        completed = true;
        clearTimeout(timeout);
        resolve({
          exitCode,
          stdout,
          stderr,
          timedOut: false,
          error: null
        });
      }
    });
  });
}

function parseValidateIssues(output) {
  return stripAnsi(output)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /\b(?:error|warning|warn)\b/i.test(line))
    .filter((line) => !/\b0\s+errors?\b/i.test(line) && !/\b0\s+warnings?\b/i.test(line));
}

function createOutputDetails(issues, output) {
  const details = issues.slice(0, MAX_REPORTED_ISSUES).map((issue) => createDetail('fdk validate', issue));

  if (details.length === 0) {
    const fallbackLines = stripAnsi(output)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, MAX_REPORTED_ISSUES);

    for (const line of fallbackLines) {
      details.push(createDetail('fdk validate', line));
    }
  }

  return details;
}

async function run(targetDir) {
  const result = await runFdkValidate(targetDir);
  const output = `${result.stdout}\n${result.stderr}`;

  if (result.error) {
    const message =
      result.error.code === 'ENOENT'
        ? 'FDK CLI is not available on PATH, so fdk validate could not be run.'
        : `fdk validate could not be started: ${result.error.message}`;

    return createResult(false, message, [createDetail('fdk validate', message)]);
  }

  if (result.timedOut) {
    const message = `fdk validate did not finish within ${FDK_VALIDATE_TIMEOUT_MS / 1000} seconds.`;
    return createResult(false, message, [createDetail('fdk validate', message)]);
  }

  const issues = parseValidateIssues(output);
  const passed = result.exitCode === 0 && issues.length === 0;

  if (passed) {
    return createResult(true, 'fdk validate completed without reported errors or warnings.');
  }

  const details = createOutputDetails(issues, output);
  const issueCountText = issues.length > 0 ? `${issues.length} warning/error line(s)` : 'an unsuccessful exit code';
  const limitText =
    issues.length > MAX_REPORTED_ISSUES
      ? ` Showing the first ${MAX_REPORTED_ISSUES}; fix these and rerun fdk validate to see remaining issues.`
      : '';

  return createResult(
    false,
    `fdk validate reported ${issueCountText}. Showing at most ${MAX_REPORTED_ISSUES} output line(s).${limitText}`,
    details
  );
}

module.exports = { run };

if (require.main === module) {
  runCli(run);
}
