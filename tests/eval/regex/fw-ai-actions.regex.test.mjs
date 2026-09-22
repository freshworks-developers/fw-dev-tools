import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', '..', '..', 'skills');
const SPEC_PATH = join(__dirname, '..', '..', '..', 'installer', 'src', 'specs', 'fw-dev-tools-spec.md');

async function readSkill(name) {
  return readFile(join(SKILLS_DIR, name, 'SKILL.md'), 'utf8');
}

async function readSpec() {
  return readFile(SPEC_PATH, 'utf8');
}

describe('Skill Regex Evals — fw-ai-actions', { concurrency: true }, () => {
  // ─── fw-ai-actions ───────────────────────────────────────────────────────────

  test('fw-ai-actions-01 fdk validate completed → write .meta.json before showing result to user', async () => {
    const c = await readSkill('fw-build-your-mcp-app');
    const ok = /meta-init\.sh/i.test(c) && /DO NOT SKIP/i.test(c);
    assert.ok(ok, 'fw-build-your-mcp-app/SKILL.md must require meta-init.sh and mark DO NOT SKIP');
  });

  test('fw-ai-actions-02 nested vendor API payload → flat parameters in actions.json, nest in server.js', async () => {
    const c = await readSkill('fw-build-your-mcp-app');
    const ok = /flat/i.test(c) && /server\.js/i.test(c) && /nested/i.test(c);
    assert.ok(ok, 'fw-build-your-mcp-app/SKILL.md must require flat parameters in actions.json and nesting in server.js');
  });

  test('fw-ai-actions-03 api_key in actions.json → must use secure iparams instead', async () => {
    const c = await readSkill('fw-build-your-mcp-app');
    const ok = /never hardcode|secure:\s*true|iparams/i.test(c) && /credentials/i.test(c);
    assert.ok(ok, 'fw-build-your-mcp-app/SKILL.md must prohibit hardcoded credentials and require secure iparams');
  });

  test('fw-ai-actions-04 external HTTP in server → $request.invokeTemplate only', async () => {
    const c = await readSkill('fw-build-your-mcp-app');
    const ok = /\$request\.invokeTemplate/i.test(c) && /never|must not|only/i.test(c);
    assert.ok(ok, 'fw-build-your-mcp-app/SKILL.md must require $request.invokeTemplate for external HTTP');
  });

  test('fw-ai-actions-05 AI-only app → no app/ folder or Crayons UI required', async () => {
    const c = await readSkill('fw-build-your-mcp-app');
    const ok = /do not need the app folder|no app folder/i.test(c);
    assert.ok(ok, 'fw-build-your-mcp-app/SKILL.md must state AI actions apps do not need the app/ folder');
  });

  test('fw-ai-actions-06 multiple manifest.json → ask which app (Q1)', async () => {
    const c = await readSkill('fw-build-your-mcp-app');
    const ok = /multiple folders.*manifest|Ask the user which app/i.test(c);
    assert.ok(ok, 'fw-build-your-mcp-app/SKILL.md must prompt user when multiple manifest.json files exist');
  });

  test('fw-ai-actions-07 actions.json handler name mismatch → must align case-sensitively', async () => {
    const c = await readSkill('fw-build-your-mcp-app');
    const ok = /case-sensitive|match exactly/i.test(c);
    assert.ok(ok, 'fw-build-your-mcp-app/SKILL.md must require case-sensitive matching between actions.json and server.js');
  });

  test('fw-ai-actions-08 array of objects in parameters → forbidden', async () => {
    const c = await readSkill('fw-build-your-mcp-app');
    const ok = /no arrays of objects/i.test(c);
    assert.ok(ok, 'fw-build-your-mcp-app/SKILL.md must forbid arrays of objects in parameters');
  });

  test('fw-ai-actions-09 no manifest.json in workspace → inform user and stop', async () => {
    const c = await readSkill('fw-build-your-mcp-app');
    const ok = /If \*\*none\*\*: Inform the user and stop/i.test(c);
    assert.ok(ok, 'fw-build-your-mcp-app/SKILL.md must stop and inform user when no manifest.json is found');
  });

  test('fw-ai-actions-10 response schemas CAN be nested — only parameters must stay flat', async () => {
    const c = await readSkill('fw-build-your-mcp-app');
    const ok = /Response schemas CAN be nested|response.*CAN.*nested|nested.*response/i.test(c);
    assert.ok(ok, 'fw-build-your-mcp-app/SKILL.md must explicitly allow nested response schemas');
  });

  test('fw-ai-actions-11 validate with FDK test server after fdk validate passes', async () => {
    const c = await readSkill('fw-build-your-mcp-app');
    const ok = /fdk validate.*FDK test server|FDK test server|ai-actions-validation/i.test(c);
    assert.ok(ok, 'fw-build-your-mcp-app/SKILL.md must reference FDK test server validation');
  });

  test('fw-ai-actions-12 test data required under server/test_data/', async () => {
    const c = await readSkill('fw-build-your-mcp-app');
    const ok = /server\/test_data/i.test(c);
    assert.ok(ok, 'fw-build-your-mcp-app/SKILL.md must require server/test_data/');
  });

  test('fw-ai-actions-13 docs first: search official API docs before implementing request templates', async () => {
    const c = await readSkill('fw-build-your-mcp-app');
    const ok = /Docs first|docs first|Search.*API documentation|fetch official API/i.test(c);
    assert.ok(ok, 'fw-build-your-mcp-app/SKILL.md must require fetching API docs before implementation');
  });

  test('fw-ai-actions-14 MCP boundary: legacy build tools deprecated, redirect to fw-app-dev', async () => {
    const c = await readSpec();
    const ok = /MCP boundary.*implement_app|implement_app.*deprecation contract/i.test(c);
    assert.ok(ok, 'spec must document MCP boundary and deprecated implement_app with deprecation contract');
  });

  test('fw-ai-actions-15 toolchain gate same as fw-app-dev: fw-setup when missing, fdk-migrate for 2.x, never downgrade', async () => {
    const c = await readSkill('fw-build-your-mcp-app');
    const ok = /fw-setup.*when.*Node 24.*FDK 10.*missing|same gate.*fw-app-dev|Manifest.*toolchain gate/i.test(c);
    assert.ok(ok, 'fw-build-your-mcp-app/SKILL.md must reference the same toolchain gate as fw-app-dev');
  });

  test('fw-ai-actions-16 manifest engines: node 24.11.0 and fdk 10.0.0 for AI actions apps', async () => {
    const c = await readSkill('fw-build-your-mcp-app');
    const ok = /"node": "24\.11\.0"/i.test(c) && /"fdk": "10\.0\.0"/i.test(c);
    assert.ok(ok, 'fw-build-your-mcp-app/SKILL.md must specify node 24.11.0 and fdk 10.0.0 as default engines');
  });

});
