import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURSOR_MCP_ENTRY } from '../src/orchestration-spec.js';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SPEC_FILE = join(REPO_ROOT, 'installer', 'src', 'specs', 'fw-dev-tools-spec.md');

// ---------------------------------------------------------------------------
// Static spec file
// ---------------------------------------------------------------------------

test('spec file is present at expected path', async () => {
  const content = await readFile(SPEC_FILE, 'utf8');
  assert.ok(content.length > 0, 'spec file must not be empty');
});

test('spec file contains routing table for all 5 skills', async () => {
  const content = await readFile(SPEC_FILE, 'utf8');
  assert.ok(content.includes('fw-app-dev'), 'should route to fw-app-dev');
  assert.ok(content.includes('fw-build-your-mcp-server'), 'should route to fw-build-your-mcp-server');
  assert.ok(content.includes('fw-review'), 'should route to fw-review');
  assert.ok(content.includes('fw-setup'), 'should route to fw-setup');
  assert.ok(content.includes('fw-publish'), 'should route to fw-publish');
});

test('spec file marks fw-review as MANDATORY', async () => {
  const content = await readFile(SPEC_FILE, 'utf8');
  assert.ok(content.includes('MANDATORY'), 'fw-review must be flagged mandatory');
});

test('spec file documents MCP boundary and deprecated build tools', async () => {
  const content = await readFile(SPEC_FILE, 'utf8');
  assert.ok(content.includes('MCP boundary'), 'should document MCP boundary');
  assert.ok(content.includes('implement_app'), 'should name deprecated implement_app');
  assert.ok(content.includes('deprecation contract'), 'should describe server deprecation contract');
  assert.ok(content.includes('fw-app-dev'), 'should redirect to fw-app-dev');
});

test('spec file includes update command hint', async () => {
  const content = await readFile(SPEC_FILE, 'utf8');
  assert.ok(content.includes('npx @freshworks/fw-dev-tools update'), 'should mention update command');
});

test('spec file mandates IDE-specific skill paths', async () => {
  const content = await readFile(SPEC_FILE, 'utf8');
  assert.ok(content.includes('IDE skill paths'), 'should document IDE skill paths');
  assert.ok(content.includes('~/.cursor/skills/fw-'), 'should specify Cursor skill path');
  assert.ok(content.includes('~/.codex/skills/fw-'), 'should specify Codex skill path');
  assert.ok(content.includes('~/.fw-dev-tools/skills/fw-'), 'should specify Claude local skill path');
  assert.ok(content.includes('Never mix paths'), 'should forbid mixing IDE skill paths');
});

test('spec file forbids hand-writing per-app .meta.json', async () => {
  const content = await readFile(SPEC_FILE, 'utf8');
  assert.ok(content.includes('meta-init.sh'), 'should reference meta-init.sh');
  assert.ok(content.includes('never') && content.includes('hand-write'), 'should forbid hand-writing .meta.json');
  assert.ok(content.includes('skill_version'), 'should document skill_version sourcing');
});

test('spec file instructs check-update.sh on first skill invocation', async () => {
  const content = await readFile(SPEC_FILE, 'utf8');
  assert.ok(content.includes('check-update.sh'), 'should reference check-update.sh');
  assert.ok(content.includes('first skill invocation'), 'should gate update check to first invocation');
  assert.ok(content.includes('update_check'), 'should document update_check metrics');
  assert.ok(content.includes('~/.fw-dev-tools/.meta.json'), 'should target install .meta.json path');
});

test('spec file contains no HTML fences or MDC frontmatter', async () => {
  const content = await readFile(SPEC_FILE, 'utf8');
  assert.ok(!content.includes('<!-- fw-dev-tools'), 'spec file must not contain fenced block markers');
  assert.ok(!content.startsWith('---'), 'spec file must not start with MDC frontmatter');
});

// ---------------------------------------------------------------------------
// CURSOR_MCP_ENTRY
// ---------------------------------------------------------------------------

test('CURSOR_MCP_ENTRY has correct MCP server URL', () => {
  assert.equal(CURSOR_MCP_ENTRY.url, 'https://mcp.freshworks.dev/mcp');
});

test('CURSOR_MCP_ENTRY has Authorization header with placeholder token', () => {
  assert.ok(CURSOR_MCP_ENTRY.headers?.Authorization, 'should have Authorization header');
  assert.ok(
    CURSOR_MCP_ENTRY.headers.Authorization.startsWith('Bearer '),
    'should use Bearer scheme'
  );
  assert.ok(
    CURSOR_MCP_ENTRY.headers.Authorization.includes('<your-api-token>'),
    'should use placeholder, not a real token'
  );
});

test('CURSOR_MCP_ENTRY has no unexpected keys', () => {
  const allowed = new Set(['url', 'headers']);
  for (const key of Object.keys(CURSOR_MCP_ENTRY)) {
    assert.ok(allowed.has(key), `unexpected key: ${key}`);
  }
});
