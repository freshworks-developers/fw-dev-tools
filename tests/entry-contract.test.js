import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = [
  'fw-setup',
  'fw-app-dev',
  'fw-build-your-mcp-server',
  'fw-review',
  'fw-publish',
];

test('all five skills define Entry contract section', async () => {
  for (const skill of SKILLS) {
    const content = await readFile(join(REPO_ROOT, 'skills', skill, 'SKILL.md'), 'utf8');
    assert.ok(content.includes('## Entry contract'), `${skill} must have Entry contract`);
    assert.ok(/hand control back to the controller/i.test(content), `${skill} must return to controller`);
    assert.ok(/Returns:.*done.*blocked.*escalate/i.test(content), `${skill} must document return statuses`);
  }
});

test('shared references include ecosystem map and session schema', async () => {
  const refs = join(REPO_ROOT, 'skills', 'shared', 'references');
  const eco = await readFile(join(refs, 'ecosystem-map.md'), 'utf8');
  const schema = await readFile(join(refs, 'fw-session-schema.json'), 'utf8');
  assert.ok(eco.includes('Freshdesk'));
  assert.ok(JSON.parse(schema).properties.step);
});

test('preflight.mdc exists in shared rules', async () => {
  const content = await readFile(
    join(REPO_ROOT, 'skills', 'shared', 'rules', 'preflight.mdc'),
    'utf8'
  );
  assert.ok(content.includes('session-read.sh'));
  assert.ok(content.includes('FDK'));
});
