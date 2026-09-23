import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { copySkills, copyScripts, copySpecs, writeInstallState, prompt, REPO_ROOT, removeFwSkillDirs, FW_SKILLS, readBrainSpecContent } from '../utils.js';
import { mergeMcpServer, patchMcpToken, readMcpToken, removeMcpServer } from '../mcp-merge.js';
import { CURSOR_MCP_ENTRY } from '../orchestration-spec.js';

const CURSOR_ROOT = process.env.FW_TEST_CURSOR_ROOT ?? join(homedir(), '.cursor');
const SKILLS_DIR = join(CURSOR_ROOT, 'skills');
const RULES_DIR = join(CURSOR_ROOT, 'rules');
const MCP_JSON = join(CURSOR_ROOT, 'mcp.json');
const SPEC_FILE = join(RULES_DIR, 'fw-dev-tools.mdc');
const BRAIN_SPEC_FILE = join(RULES_DIR, 'fw-dev-tools-agent-behaviour.mdc');
const SPEC_SRC = join(REPO_ROOT, 'installer', 'src', 'specs', 'fw-dev-tools-spec.md');

const MDC_FRONTMATTER = `---
name: fw-dev-tools
description: Freshworks Agentic Developer Toolkit — routing and skill orchestration
alwaysApply: true
---

`;

const BRAIN_MDC_FRONTMATTER = `---
name: fw-dev-tools-agent-behaviour
description: Freshworks App Development AI Agent — orchestration brain (Tier 2)
alwaysApply: true
---

`;

export async function install({ yes = false } = {}) {
  console.log('→ Installing for Cursor...');

  await copyScripts();
  console.log('  ✓ Scripts installed to ~/.fw-dev-tools/scripts/');

  await copySpecs();
  console.log('  ✓ Orchestration specs copied to ~/.fw-dev-tools/specs/');

  const removed = await removeFwSkillDirs(SKILLS_DIR);
  if (removed > 0) {
    console.log(`  ✓ Removed ${removed} previous fw-dev-tools skill(s) from ${SKILLS_DIR}`);
  }

  await copySkills(SKILLS_DIR);
  console.log(`  ✓ Skills copied to ${SKILLS_DIR}`);

  const claudeSkillsDir = join(homedir(), '.claude', 'skills');
  const foundClaude = FW_SKILLS.filter((s) => existsSync(join(claudeSkillsDir, s)));
  if (foundClaude.length > 0) {
    console.log(`  ⚠  Found fw-dev-tools skills in ${claudeSkillsDir}: ${foundClaude.join(', ')}`);
    console.log('     Cursor reads skills from ~/.cursor/skills/ only — remove stale Claude copies if you are not using Claude Code.');
  }

  // Warn if old npx-skills-add workspace installs exist
  const workspaceSkillsDir = join(process.cwd(), '.agents', 'skills');
  const OLD_SKILLS = ['fw-setup', 'fw-app-dev', 'fw-marketplace-app-dev', 'fw-ai-actions-app', 'fw-build-your-mcp-app', 'fw-build-your-mcp-server', 'fw-review', 'fw-publish'];
  const foundWorkspace = OLD_SKILLS.filter(s => existsSync(join(workspaceSkillsDir, s)));
  if (foundWorkspace.length > 0) {
    console.log(`  ⚠  Found old workspace skills in ${workspaceSkillsDir}: ${foundWorkspace.join(', ')}`);
    console.log('     These were installed via "npx skills add" and are no longer needed.');
    console.log(`     Remove them with: rm -rf ${workspaceSkillsDir}/fw-*`);
  }

  await mkdir(RULES_DIR, { recursive: true });
  const specContent = await readFile(SPEC_SRC, 'utf8');
  await writeFile(SPEC_FILE, MDC_FRONTMATTER + specContent, 'utf8');
  console.log(`  ✓ Routing spec written to ${SPEC_FILE}`);

  const brainContent = await readBrainSpecContent();
  await writeFile(BRAIN_SPEC_FILE, BRAIN_MDC_FRONTMATTER + brainContent, 'utf8');
  console.log(`  ✓ Agent behaviour spec written to ${BRAIN_SPEC_FILE}`);

  const { action, backupPath } = await mergeMcpServer(MCP_JSON, CURSOR_MCP_ENTRY);
  if (action === 'unchanged') {
    console.log(`  ✓ MCP config already up to date`);
  } else {
    console.log(`  ✓ MCP config ${action === 'created' ? 'added' : 'merged'} in ${MCP_JSON}`);
    if (backupPath) console.log(`    (backup: ${backupPath})`);
  }

  const existingToken = await readMcpToken(MCP_JSON);
  if (existingToken) {
    console.log('  ✓ API key already configured');
  } else {
    const token = await prompt(
      '\n  Enter your Freshworks Developer Portal API key\n  (get one at https://developers.freshworks.com/developer/ → leave blank to skip):\n  > ',
      { yes }
    );
    if (token) {
      await patchMcpToken(MCP_JSON, token);
      console.log('  ✓ API key saved to MCP config');
    } else {
      console.log('  ℹ  API key skipped — add it later to enable fw-publish');
    }
  }

  await writeInstallState({ client: 'cursor' });
  console.log('\n✓ fw-dev-tools installed for Cursor');
  console.log('  Restart Cursor (close all windows) to load the skills.');
  console.log('  Then type /fw-setup- in chat to confirm commands appear.\n');
}

export async function uninstall({ yes = false } = {}) {
  const confirmed = yes
    ? 'y'
    : await prompt('Remove fw-dev-tools skills and routing spec from Cursor? [y/N] ', { yes });
  if (confirmed.toLowerCase() !== 'y') {
    console.log('Uninstall cancelled.');
    return;
  }
  const removed = await removeFwSkillDirs(SKILLS_DIR);
  if (removed > 0) console.log(`  ✓ Removed ${removed} fw-dev-tools skill(s) from ${SKILLS_DIR}`);
  if (existsSync(SPEC_FILE)) {
    await rm(SPEC_FILE);
    console.log(`  ✓ Removed ${SPEC_FILE}`);
  }
  if (existsSync(BRAIN_SPEC_FILE)) {
    await rm(BRAIN_SPEC_FILE);
    console.log(`  ✓ Removed ${BRAIN_SPEC_FILE}`);
  }

  const { action, backupPath } = await removeMcpServer(MCP_JSON);
  if (action === 'removed') {
    console.log(`  ✓ MCP server removed from ${MCP_JSON}`);
    if (backupPath) console.log(`    (backup: ${backupPath})`);
  }

  console.log('\n✓ Cursor uninstall complete. Restart Cursor to apply.');
}
