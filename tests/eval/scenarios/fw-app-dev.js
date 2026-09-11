import assert from 'node:assert/strict';
import { loadSkill, loadCommand, loadSpec, loadSkillWithSpec } from '../scenario-helpers.js';
export const FW_APP_DEV_SCENARIOS = [
  // fw-app-dev-01: platform 2.x → must migrate first, not validate
  {
    id: 'fw-app-dev-01',
    skill: 'fw-app-dev',
    label: 'platform-version 2.3 → must run fdk-migrate before fdk validate',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'The app has platform-version "2.3" in manifest.json. The developer says: run fdk validate.',
    schema: {
      type: 'object',
      required: ['should_run_fdk_migrate_first', 'should_run_fdk_validate_directly'],
      properties: {
        should_run_fdk_migrate_first: { type: 'boolean' },
        should_run_fdk_validate_directly: { type: 'boolean' },
        reasoning: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.should_run_fdk_migrate_first, true, 'must migrate before validate on 2.x app');
      assert.equal(output.should_run_fdk_validate_directly, false, 'must NOT run fdk validate directly on 2.x app');
    },
  },

  // fw-app-dev-02: after validate passes → write .meta.json before reporting
  {
    id: 'fw-app-dev-02',
    skill: 'fw-app-dev',
    label: 'fdk validate passed → write .meta.json before reporting, never mention to user',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'fdk validate just completed successfully with zero errors and zero lint errors. What is the very next action before reporting results to the user? Be specific.',
    schema: {
      type: 'object',
      required: ['writes_meta_json', 'mentions_meta_json_to_user', 'next_action'],
      properties: {
        writes_meta_json: { type: 'boolean' },
        mentions_meta_json_to_user: { type: 'boolean' },
        next_action: { type: 'string', enum: ['write_meta_json', 'report_to_user', 'run_validate_again', 'other'] },
      },
    },
    assert(output) {
      assert.equal(output.writes_meta_json, true, 'must write .meta.json after validate passes');
      assert.equal(output.mentions_meta_json_to_user, false, 'must NOT mention .meta.json to developer');
      assert.equal(output.next_action, 'write_meta_json', 'next action must be write_meta_json');
    },
  },

  // fw-app-dev-03: lint error remains → cannot mark app complete
  {
    id: 'fw-app-dev-03',
    skill: 'fw-app-dev',
    label: '1 lint error remaining after 3 iterations → cannot mark app complete',
    loadContent: () => loadCommand('fw-app-dev', 'fdk-fix'),
    prompt: 'fdk validate has been run 3 times. There are zero platform errors but 1 lint error still remains (async function without await). Can the app be marked as complete and reported to the user?',
    schema: {
      type: 'object',
      required: ['can_mark_complete', 'reason_includes_lint'],
      properties: {
        can_mark_complete: { type: 'boolean' },
        reason_includes_lint: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.can_mark_complete, false, 'must NOT mark app complete with lint errors');
      assert.equal(output.reason_includes_lint, true, 'reason must reference lint errors');
    },
  },

  // fw-app-dev-04: /fdk-review invoked → redirect to fw-review, do NOT handle in fw-app-dev
  {
    id: 'fw-app-dev-04',
    skill: 'fw-app-dev',
    label: '/fdk-review invoked → agent must redirect to fw-review skill, not handle in fw-app-dev',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'The developer types /fdk-review in the chat. What should happen? Should fw-app-dev handle this review request, or should it redirect the developer to use the fw-review skill?',
    schema: {
      type: 'object',
      required: ['should_handle_in_fw_app_dev', 'should_redirect_to_fw_review'],
      properties: {
        should_handle_in_fw_app_dev: { type: 'boolean' },
        should_redirect_to_fw_review: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.should_handle_in_fw_app_dev, false, 'fw-app-dev must NOT handle /fdk-review itself');
      assert.equal(output.should_redirect_to_fw_review, true, 'must redirect developer to fw-review skill');
    },
  },

  // fw-app-dev-05: .meta.json write must use meta-init.sh / meta-update.sh, not manual JSON write
  {
    id: 'fw-app-dev-05',
    skill: 'fw-app-dev',
    label: '.meta.json write → must invoke meta-init.sh and meta-update.sh scripts, not write JSON manually',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'fdk validate just passed with zero errors. You need to write .meta.json. Describe exactly how you would do it — would you write the JSON file directly, or run a script? If a script, which one(s)?',
    schema: {
      type: 'object',
      required: ['writes_json_directly', 'runs_meta_init_sh', 'runs_meta_update_sh'],
      properties: {
        writes_json_directly: { type: 'boolean' },
        runs_meta_init_sh: { type: 'boolean' },
        runs_meta_update_sh: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.writes_json_directly, false, 'must NOT write .meta.json JSON directly — use scripts');
      assert.equal(output.runs_meta_init_sh, true, 'must run meta-init.sh');
      assert.equal(output.runs_meta_update_sh, true, 'must run meta-update.sh');
    },
  },

  // fw-app-dev-06: validate_iterations and validation_error_categories tracked correctly
  {
    id: 'fw-app-dev-06',
    skill: 'fw-app-dev',
    label: 'validate_iterations → must equal actual fdk validate run count, error categories appended per unique type',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'fdk validate was run 3 times. Run 1 had errors: "lint-async-no-await" and "missing-request-template". Run 2 had "lint-async-no-await" again. Run 3 passed. When calling meta-update.sh, what value should validate_iterations be, and which categories should be appended to validation_error_categories?',
    schema: {
      type: 'object',
      required: ['validate_iterations', 'validation_error_categories', 'deduplicates_categories'],
      properties: {
        validate_iterations: { type: 'number' },
        validation_error_categories: { type: 'array', items: { type: 'string' } },
        deduplicates_categories: { type: 'boolean' },
      },
    },
    assert(output) {
      assert.equal(output.validate_iterations, 3, 'validate_iterations must equal total fdk validate runs (3)');
      assert.ok(
        output.validation_error_categories.includes('lint-async-no-await') &&
        output.validation_error_categories.includes('missing-request-template'),
        'must include both unique error categories'
      );
      assert.equal(output.deduplicates_categories, true, 'must not duplicate categories already appended');
    },
  },

  // spec-01: check-update.sh run on first invocation only — not on every message
  {
    id: 'spec-01',
    skill: 'fw-app-dev',
    label: 'update check: run check-update.sh on first skill invocation only, not on every message',
    loadContent: () => loadSkillWithSpec('fw-app-dev'),
    prompt: 'This is the first time a skill has been invoked in this session. The developer asks you to fix a validation error. Before handling that request, what update-related command, if any, should you run? Should you run it on every subsequent message in this session as well?',
    schema: {
      type: 'object',
      required: ['runs_check_update_sh', 'runs_on_every_message', 'runs_on_first_invocation_only'],
      properties: {
        runs_check_update_sh: { type: 'boolean' },
        runs_on_every_message: { type: 'boolean' },
        runs_on_first_invocation_only: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.runs_check_update_sh, true, 'must run check-update.sh on first invocation');
      assert.equal(output.runs_on_every_message, false, 'must NOT run check-update.sh on every message');
      assert.equal(output.runs_on_first_invocation_only, true, 'must run only on first skill invocation per session');
    },
  },

  // fw-app-dev-07: prerequisite check — /fw-setup-status before build
  {
    id: 'fw-app-dev-07',
    skill: 'fw-app-dev',
    label: 'must run /fw-setup-status before building a new app',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'A developer asks you to build a new Freshdesk serverless app from scratch. You have not checked the toolchain yet. What is the first fw-setup command you must run before creating any app files or running fdk validate?',
    schema: {
      type: 'object',
      required: ['first_command', 'proceeds_without_setup_check'],
      properties: {
        first_command: { type: 'string' },
        proceeds_without_setup_check: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.match(output.first_command, /fw-setup-status|fdk.{0,5}version|node.{0,10}version|toolchain|prerequisite|smart.prereq/i, 'first step must be a toolchain/FDK version check');
      assert.equal(output.proceeds_without_setup_check, false, 'must not proceed without toolchain check');
    },
  },

  {
    id: 'fw-app-dev-08',
    skill: 'fw-app-dev',
    label: 'implement_app MCP tool requested → refuse, use fw-app-dev skill flow',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'The developer says: use the implement_app MCP tool to build this Freshdesk app quickly. Should you call implement_app?',
    schema: {
      type: 'object',
      required: ['should_call_implement_app', 'should_use_fw_app_dev_skill'],
      properties: {
        should_call_implement_app: { type: 'boolean' },
        should_use_fw_app_dev_skill: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.should_call_implement_app, false, 'must NOT call deprecated implement_app');
      assert.equal(output.should_use_fw_app_dev_skill, true, 'must use fw-app-dev skill workflow');
    },
  },

  {
    id: 'fw-app-dev-09',
    skill: 'fw-app-dev',
    label: 'FDK 10 + Node 24 installed, manifest engines 9/18 → raise engines, not downgrade toolchain',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Shell has FDK 10.0.1 and Node v24.11.0. manifest.json engines are "fdk": "9.8.2", "node": "18.20.8". platform-version is "3.0". Should you downgrade the machine to FDK 9 / Node 18 to match manifest engines?',
    schema: {
      type: 'object',
      required: ['downgrades_toolchain', 'updates_manifest_engines_upward'],
      properties: {
        downgrades_toolchain: { type: 'boolean' },
        updates_manifest_engines_upward: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.downgrades_toolchain, false, 'must NOT downgrade toolchain to match legacy engines');
      assert.equal(output.updates_manifest_engines_upward, true, 'must align manifest engines upward to 10.x/24.x');
    },
  },

  {
    id: 'fw-app-dev-10',
    skill: 'fw-app-dev',
    label: '6 validate iterations failed → LAST RESORT engines downgrade only then',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'fdk validate has been run 6 times on FDK 10 + Node 24 and still fails. The developer asks to downgrade manifest engines to FDK 9 / Node 18 immediately to unblock. Should you downgrade engines before exhausting the 6-iteration loop?',
    schema: {
      type: 'object',
      required: ['downgrade_before_six_iterations', 'last_resort_only_after_six'],
      properties: {
        downgrade_before_six_iterations: { type: 'boolean' },
        last_resort_only_after_six: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.downgrade_before_six_iterations, false, 'must not downgrade engines as first move');
      assert.equal(output.last_resort_only_after_six, true, 'LAST RESORT only after 6 failed iterations');
    },
  },

  {
    id: 'fw-app-dev-11',
    skill: 'fw-app-dev',
    label: 'Platform 2.x product block → migrate, not validate on 3.0 toolchain',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'manifest.json has platform-version "2.3" and a legacy "product" block. FDK 10 and Node 24 are installed. Should you run fdk validate directly?',
    schema: {
      type: 'object',
      required: ['should_run_fdk_migrate_first', 'should_run_fdk_validate_directly'],
      properties: {
        should_run_fdk_migrate_first: { type: 'boolean' },
        should_run_fdk_validate_directly: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.should_run_fdk_migrate_first, true, 'must migrate Platform 2.x first');
      assert.equal(output.should_run_fdk_validate_directly, false, 'must not validate 2.x manifest directly');
    },
  },

  {
    id: 'spec-02',
    skill: 'fw-app-dev',
    label: 'update check: check-update.sh once per session only',
    loadContent: () => loadSpec(),
    prompt: 'This is the developer\'s fifth message in the same Cursor session. fw-dev-tools was already loaded earlier. Should you run check-update.sh again on this message?',
    schema: {
      type: 'object',
      required: ['runs_check_update_again', 'once_per_session'],
      properties: {
        runs_check_update_again: { type: 'boolean' },
        once_per_session: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.runs_check_update_again, false, 'must not run check-update on every message');
      assert.equal(output.once_per_session, true, 'update check is once per session');
    },
  },

  {
    id: 'fw-app-dev-12',
    skill: 'fw-app-dev',
    label: 'fdk missing → offer fw-setup, no silent install',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'According to the fw-app-dev skill: when building a new app, `fdk --version` fails (command not found). Should the skill STOP and ask the user first (stops_for_missing_fdk = true), avoid silently running /fw-setup-install (silent_install = false), and instead offer fw-setup (offers_fw_setup = true)?',
    schema: {
      type: 'object',
      required: ['stops_for_missing_fdk', 'silent_install', 'offers_fw_setup'],
      properties: {
        stops_for_missing_fdk: { type: 'boolean' },
        silent_install: { type: 'boolean' },
        offers_fw_setup: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.stops_for_missing_fdk, true, 'must STOP when fdk missing');
      assert.equal(output.silent_install, false, 'must not silently install fdk');
      assert.equal(output.offers_fw_setup, true, 'must offer fw-setup');
    },
  },

  {
    id: 'fw-app-dev-13',
    skill: 'fw-app-dev',
    label: 'FDK 9 + Platform 2.x app → run fw-setup-install then fdk-migrate',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Installed toolchain: FDK 9.8.2, Node 18.20.8. manifest.json has platform-version "2.3" and engines fdk 9.x / node 18.x. User asks to work on this app. What is the correct first sequence?',
    schema: {
      type: 'object',
      required: ['runs_fw_setup_install_first', 'runs_fdk_migrate', 'runs_fdk_validate_directly'],
      properties: {
        runs_fw_setup_install_first: { type: 'boolean' },
        runs_fdk_migrate: { type: 'boolean' },
        runs_fdk_validate_directly: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.runs_fw_setup_install_first, true, 'must upgrade toolchain first (Scenario A)');
      assert.equal(output.runs_fdk_migrate, true, 'must migrate after toolchain upgrade');
      assert.equal(output.runs_fdk_validate_directly, false, 'must not validate 2.x app on legacy toolchain');
    },
  },

  {
    id: 'fw-app-dev-14',
    skill: 'fw-app-dev',
    label: 'FDK 9 + Platform 3.0 manifest → upgrade toolchain, never downgrade app',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Installed: FDK 9.8.2, Node 18.20.8. manifest.json is already platform-version "3.0" with engines fdk 9.8.2 and node 18.20.8. Should you downgrade the app manifest to match the old toolchain, or upgrade the toolchain?',
    schema: {
      type: 'object',
      required: ['downgrades_app_engines', 'upgrades_toolchain'],
      properties: {
        downgrades_app_engines: { type: 'boolean' },
        upgrades_toolchain: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.downgrades_app_engines, false, 'must not downgrade 3.0 app to FDK 9/Node 18');
      assert.equal(output.upgrades_toolchain, true, 'must upgrade toolchain to FDK 10 + Node 24');
    },
  },

  {
    id: 'fw-app-dev-15',
    skill: 'fw-app-dev',
    label: 'client $request.post() → must use $request.invokeTemplate',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'In app/scripts/app.js you need to call an external API from the Freshdesk client UI. Can you use $request.post() directly?',
    schema: {
      type: 'object',
      required: ['allows_request_post', 'uses_invoke_template'],
      properties: {
        allows_request_post: { type: 'boolean' },
        uses_invoke_template: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.allows_request_post, false, 'must not use $request.post in client');
      assert.equal(output.uses_invoke_template, true, 'must use $request.invokeTemplate via request templates');
    },
  },

  {
    id: 'fw-app-dev-16',
    skill: 'fw-app-dev',
    label: '"product" block in manifest → reject, use "modules"',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'According to the fw-app-dev skill: a manifest.json contains `"product": { "freshdesk": {} }` instead of a `"modules"` block. Is the `product` block forbidden on Platform 3.0 (product_block_is_forbidden = true) and must it be replaced with a `modules` block (must_use_modules = true)?',
    schema: {
      type: 'object',
      required: ['product_block_is_forbidden', 'must_use_modules'],
      properties: {
        product_block_is_forbidden: { type: 'boolean' },
        must_use_modules: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.product_block_is_forbidden, true, 'product block is forbidden on Platform 3.0');
      assert.equal(output.must_use_modules, true, 'must use modules not product');
    },
  },

  {
    id: 'spec-03',
    skill: 'fw-app-dev',
    label: 'mandatory end-to-end skill order before publish',
    loadContent: () => loadSpec(),
    prompt: 'User built an app with fw-app-dev and wants to publish immediately without review. What is the correct skill order from toolchain to marketplace?',
    schema: {
      type: 'object',
      required: ['includes_fw_review_before_publish', 'can_skip_fw_review'],
      properties: {
        includes_fw_review_before_publish: { type: 'boolean' },
        can_skip_fw_review: { type: 'boolean' },
        skill_order: { type: 'string' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.includes_fw_review_before_publish, true, 'fw-review must come before fw-publish');
      assert.equal(output.can_skip_fw_review, false, 'cannot skip mandatory fw-review');
    },
  },

  {
    id: 'spec-04',
    skill: 'fw-app-dev',
    label: 'check-update.sh writes update_check to ~/.fw-dev-tools/.meta.json, not per-app .meta.json',
    loadContent: () => loadSpec(),
    prompt: 'You are about to run check-update.sh on the first skill invocation of this session. Which .meta.json file does it update? Which fields does it write? Should you add update_check fields to the app directory .meta.json via meta-update.sh?',
    schema: {
      type: 'object',
      required: [
        'updates_install_meta_json',
        'writes_update_check_fields',
        'writes_update_check_to_per_app_meta',
      ],
      properties: {
        updates_install_meta_json: { type: 'boolean' },
        writes_update_check_fields: { type: 'boolean' },
        writes_update_check_to_per_app_meta: { type: 'boolean' },
        target_path: { type: 'string' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.updates_install_meta_json, true, 'must update ~/.fw-dev-tools/.meta.json');
      assert.equal(output.writes_update_check_fields, true, 'must write update_check fields via script');
      assert.equal(output.writes_update_check_to_per_app_meta, false, 'must NOT write update_check to per-app .meta.json');
    },
  },

  // fw-app-dev-17: /fdk-refactor → inline code improvement, NOT fdk CLI refactor
  {
    id: 'fw-app-dev-17',
    skill: 'fw-app-dev',
    label: '/fdk-refactor → inline code improvement, not fdk CLI refactor command',
    loadContent: () => loadCommand('fw-app-dev', 'fdk-refactor'),
    prompt: 'According to the fdk-refactor command: when /fdk-refactor is invoked, does it call the fdk CLI refactor command (calls_fdk_cli_refactor = false), or does it run an inline code quality improvement on the existing app files (runs_inline_code_improvement = true)?',
    schema: {
      type: 'object',
      required: ['calls_fdk_cli_refactor', 'runs_inline_code_improvement'],
      properties: {
        calls_fdk_cli_refactor: { type: 'boolean' },
        runs_inline_code_improvement: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.calls_fdk_cli_refactor, false, 'must NOT call the fdk CLI refactor command');
      assert.equal(output.runs_inline_code_improvement, true, 'must run inline code quality improvement on app files');
    },
  },

  // fw-app-dev-18: manifest engines must match installed FDK — raise engines, never downgrade toolchain
  {
    id: 'fw-app-dev-18',
    skill: 'fw-app-dev',
    label: 'manifest engines must match installed FDK — raise engines, never downgrade toolchain',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Installed: FDK 10.0.1 on Node 24.11. New app generated. manifest.json has engines: fdk 9.8.2, node 18.20.8 from a template. Should you downgrade the machine to FDK 9 to match the manifest, or update manifest engines to 10.0.1 / 24.11.0?',
    schema: {
      type: 'object',
      required: ['downgrades_toolchain', 'updates_manifest_engines'],
      properties: {
        downgrades_toolchain: { type: 'boolean' },
        updates_manifest_engines: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.downgrades_toolchain, false, 'must NOT downgrade toolchain to match stale manifest engines');
      assert.equal(output.updates_manifest_engines, true, 'must update manifest engines to match installed toolchain');
    },
  },

  // spec-05: FDK 10 + correct engines → go straight to build
  {
    id: 'spec-05',
    skill: 'fw-app-dev',
    label: 'FDK 10 + Platform 3.0 with correct engines → proceed directly to build without fw-setup',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Installed: FDK 10.0.1, Node v24.11.0. manifest.json has platform-version 3.0, engines fdk 10.0.1 and node 24.11.0. Developer asks to add a new feature. The fw-app-dev skill states: when the installed FDK version and Node version already match the manifest engines, skip fw-setup and proceed directly to building — do NOT run fw-setup-install unnecessarily. Given this rule, should you run fw-setup-install first, or proceed directly to building?',
    schema: {
      type: 'object',
      required: ['runs_fw_setup_install_unnecessarily', 'proceeds_to_build_directly'],
      properties: {
        runs_fw_setup_install_unnecessarily: { type: 'boolean' },
        proceeds_to_build_directly: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.runs_fw_setup_install_unnecessarily, false, 'must NOT run fw-setup-install when toolchain already matches');
      assert.equal(output.proceeds_to_build_directly, true, 'must proceed directly to build when toolchain and engines match');
    },
  },

  // fw-app-dev-19: no extra docs generated alongside app files
  {
    id: 'fw-app-dev-19',
    skill: 'fw-app-dev',
    label: 'Build app without generating extra markdown documents',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Build a simple Freshdesk ticket sidebar app that shows the ticket subject and requester email. Use Freshdesk product, frontend-only app. The fw-app-dev skill states: "Do not generate planning documents, architecture summaries, design docs, or implementation notes alongside the app files — only generate the actual app files (manifest.json, app/, config/) and README.md if needed." Following this rule, does the model correctly avoid generating extra markdown documents (like design-doc.md, implementation-notes.md, or architecture.md)?',
    schema: {
      type: 'object',
      required: ['generates_only_app_files', 'does_not_generate_extra_docs'],
      properties: {
        generates_only_app_files: { type: 'boolean' },
        does_not_generate_extra_docs: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.generates_only_app_files, true, 'model should generate only necessary app files (manifest, app/, config/, README.md)');
      assert.equal(output.does_not_generate_extra_docs, true, 'model should not generate extra markdown documents like design docs, implementation notes, or architecture summaries');
    },
  },

  // fw-app-dev-21: already on platform-version 3.0, migration should be skipped
  {
    id: 'fw-app-dev-21',
    skill: 'fw-app-dev',
    label: 'Detect already-migrated app and skip migration steps',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'According to the fw-app-dev skill: a developer asks to migrate their app to Platform 3.0, and the current manifest.json is:\n\n```json\n{\n  "platform-version": "3.0",\n  "modules": {\n    "freshdesk": {\n      "ticket_sidebar": [\n        {\n          "url": "index.html",\n          "icon": "styles/images/icon.svg"\n        }\n      ]\n    }\n  },\n  "engines": {\n    "node": "24.11.0",\n    "fdk": "10.0.1"\n  }\n}\n```\n\nSince this manifest is already on platform-version 3.0, should the skill detect it as already migrated (detects_already_migrated = true) and skip the migration steps (skips_migration_steps = true)?',
    schema: {
      type: 'object',
      required: ['detects_already_migrated', 'skips_migration_steps'],
      properties: {
        detects_already_migrated: { type: 'boolean' },
        skips_migration_steps: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.detects_already_migrated, true, 'model should detect that the app is already on platform-version 3.0 and report it as already migrated');
      assert.equal(output.skips_migration_steps, true, 'model should not run migration steps on an app that is already on Platform 3.0');
    },
  },

  {
    id: 'fw-app-dev-23',
    skill: 'fw-app-dev',
    label: 'single manifest → fix runs in that directory without asking which app',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer says "Fix all platform and lint errors in my app". There is exactly one manifest.json in the workspace under ./my-freshdesk-app/. Should the skill ask the developer which app to fix, or proceed directly?',
    schema: {
      type: 'object',
      required: ['asks_which_app', 'proceeds_directly'],
      properties: {
        asks_which_app: { type: 'boolean' },
        proceeds_directly: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.asks_which_app, false, 'must NOT ask which app when only one manifest exists');
      assert.equal(output.proceeds_directly, true, 'must proceed directly to fixing the single app');
    },
  },

  {
    id: 'fw-app-dev-24',
    skill: 'fw-app-dev',
    label: '2+ manifests found → asks which app before running fdk validate',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer says "Fix all validation errors in my app". There are two manifest.json files — one under ./freshdesk-app/ and one under ./freshservice-app/. What should the skill do before running fdk validate?',
    schema: {
      type: 'object',
      required: ['asks_which_app', 'runs_fdk_validate_without_asking'],
      properties: {
        asks_which_app: { type: 'boolean' },
        runs_fdk_validate_without_asking: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.asks_which_app, true, 'must ask which app when multiple manifests are found');
      assert.equal(output.runs_fdk_validate_without_asking, false, 'must not run fdk validate before user selects the app');
    },
  },

  {
    id: 'fw-app-dev-25',
    skill: 'fw-app-dev',
    label: 'no manifest.json found → stops with clear message, no fake report',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer says "Fix all validation errors in my app". No manifest.json file exists anywhere in the workspace. What should the skill do?',
    schema: {
      type: 'object',
      required: ['stops_with_message', 'generates_fake_report'],
      properties: {
        stops_with_message: { type: 'boolean' },
        generates_fake_report: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.stops_with_message, true, 'must stop with a clear message when no manifest exists');
      assert.equal(output.generates_fake_report, false, 'must not generate a fake validation report');
    },
  },

  {
    id: 'fw-app-dev-26',
    skill: 'fw-app-dev',
    label: 'after fix → concise success message with validation status, no detailed fix list',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'fdk validate finally passes with zero platform errors and zero lint errors after fixes. According to the fw-app-dev skill: (1) should the final message enumerate each individual fix that was applied, or just give a concise success message? (2) must it state that validation passed?',
    schema: {
      type: 'object',
      required: ['enumerates_each_fix', 'states_validation_passed'],
      properties: {
        enumerates_each_fix: { type: 'boolean' },
        states_validation_passed: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.enumerates_each_fix, false, 'skill requires concise success message, not a detailed fix enumeration');
      assert.equal(output.states_validation_passed, true, 'final message must state validation passed');
    },
  },

  {
    id: 'fw-app-dev-27',
    skill: 'fw-app-dev',
    label: 'deep validation: round 1 = all errors, round 2 = fatals only, round 3 = final status',
    loadContent: () => loadCommand('fw-app-dev', 'fdk-fix'),
    prompt: 'Read the fdk-fix command loaded above. Based on its steps: (1) does Step 3 capture ALL validation output — fatal errors, lint errors, and warnings together (step3_captures_all_output = true)? (2) in Step 4, are fatal/platform errors fixed at higher priority than lint errors — Priority 1 = fatals, Priority 2 = lint (step4_fatals_before_lint = true)? (3) does Step 7 report the validation pass/fail status after all fixes (step7_reports_final_status = true)?',
    schema: {
      type: 'object',
      required: ['step3_captures_all_output', 'step4_fatals_before_lint', 'step7_reports_final_status'],
      properties: {
        step3_captures_all_output: { type: 'boolean' },
        step4_fatals_before_lint: { type: 'boolean' },
        step7_reports_final_status: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.step3_captures_all_output, true, 'Step 3 must capture all error types');
      assert.equal(output.step4_fatals_before_lint, true, 'Step 4 must prioritise fatal errors before lint');
      assert.equal(output.step7_reports_final_status, true, 'Step 7 must report final pass/fail status');
    },
  },

  {
    id: 'fw-app-dev-28',
    skill: 'fw-app-dev',
    label: 'fdk missing when deep validation requested → defer to fw-setup before rounds',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer requests "Run deep validation on my app" but `fdk --version` fails — FDK is not installed. Should the skill start validation rounds anyway, or defer to fw-setup first?',
    schema: {
      type: 'object',
      required: ['defers_to_fw_setup', 'starts_validation_anyway'],
      properties: {
        defers_to_fw_setup: { type: 'boolean' },
        starts_validation_anyway: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.defers_to_fw_setup, true, 'must defer to fw-setup when fdk is missing');
      assert.equal(output.starts_validation_anyway, false, 'must not start validation rounds without fdk');
    },
  },

  {
    id: 'fw-app-dev-29',
    skill: 'fw-app-dev',
    label: 'legacy manifest → migrate gate runs before validation rounds',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer requests "Run deep validation on my app" but the manifest.json has platform-version "2.3". Should the skill run fdk-migrate first before starting any validation rounds?',
    schema: {
      type: 'object',
      required: ['runs_migrate_gate_first', 'starts_validation_on_2x_manifest'],
      properties: {
        runs_migrate_gate_first: { type: 'boolean' },
        starts_validation_on_2x_manifest: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.runs_migrate_gate_first, true, 'must run fdk-migrate before validation rounds on 2.x app');
      assert.equal(output.starts_validation_on_2x_manifest, false, 'must not start validation rounds on an unmigrated 2.x manifest');
    },
  },

  {
    id: 'fw-app-dev-30',
    skill: 'fw-app-dev',
    label: 'OAuth for Slack → oauth_config.json with integrations wrapper, not iparams.json',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer wants to add OAuth for Slack to a Freshdesk app. Where should the OAuth client_id and client_secret go — in config/iparams.json or in config/oauth_config.json with an "integrations" wrapper? And how should access_token be referenced in request templates?',
    schema: {
      type: 'object',
      required: ['uses_oauth_config_json', 'uses_integrations_wrapper', 'uses_access_token_in_template'],
      properties: {
        uses_oauth_config_json: { type: 'boolean' },
        uses_integrations_wrapper: { type: 'boolean' },
        uses_access_token_in_template: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.uses_oauth_config_json, true, 'OAuth credentials must go in oauth_config.json not iparams.json');
      assert.equal(output.uses_integrations_wrapper, true, 'oauth_config.json must have an integrations wrapper');
      assert.equal(output.uses_access_token_in_template, true, 'access_token must be used in request templates');
    },
  },

  {
    id: 'fw-app-dev-31',
    skill: 'fw-app-dev',
    label: 'no auto-generated .validation-report.md or APPS-SUMMARY.md after app generation',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'After generating a new Freshdesk sidebar app, should the skill automatically create extra documentation files such as .validation-report.md or APPS-SUMMARY.md in the workspace?',
    schema: {
      type: 'object',
      required: ['creates_validation_report_md', 'creates_apps_summary_md'],
      properties: {
        creates_validation_report_md: { type: 'boolean' },
        creates_apps_summary_md: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.creates_validation_report_md, false, 'must NOT auto-create .validation-report.md');
      assert.equal(output.creates_apps_summary_md, false, 'must NOT auto-create APPS-SUMMARY.md');
    },
  },

  {
    id: 'fw-app-dev-32',
    skill: 'fw-app-dev',
    label: 'multiple manifests during migrate → asks which app before migrating',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer says "Migrate this app to Platform 3.0". There are two manifest.json files in the workspace — ./app-a/manifest.json and ./app-b/manifest.json. What should the skill do before running fdk-migrate?',
    schema: {
      type: 'object',
      required: ['asks_which_app', 'runs_migrate_without_asking'],
      properties: {
        asks_which_app: { type: 'boolean' },
        runs_migrate_without_asking: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.asks_which_app, true, 'must ask which app to migrate when multiple manifests exist');
      assert.equal(output.runs_migrate_without_asking, false, 'must not run fdk-migrate before user selects the app');
    },
  },

  {
    id: 'fw-app-dev-33',
    skill: 'fw-app-dev',
    label: 'refactored server.js has helpers after the exports = {...} block',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'After refactoring server.js to reduce cyclomatic complexity, where in the file should helper functions be placed — before or after the exports = { ... } block?',
    schema: {
      type: 'object',
      required: ['helpers_after_exports', 'helpers_before_exports'],
      properties: {
        helpers_after_exports: { type: 'boolean' },
        helpers_before_exports: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.helpers_after_exports, true, 'helpers must be placed AFTER the exports = {...} block');
      assert.equal(output.helpers_before_exports, false, 'helpers must NOT be placed before the exports block');
    },
  },

  {
    id: 'fw-app-dev-34',
    skill: 'fw-app-dev',
    label: 'refactor is structure-only — behavior unchanged, same exports',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer asks to refactor server.js to reduce complexity. Should the refactoring change the observable behavior of the app or the exported handler names, or should it only restructure the internal code?',
    schema: {
      type: 'object',
      required: ['changes_behavior', 'changes_export_names', 'structure_only'],
      properties: {
        changes_behavior: { type: 'boolean' },
        changes_export_names: { type: 'boolean' },
        structure_only: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.changes_behavior, false, 'refactor must not change observable behavior');
      assert.equal(output.changes_export_names, false, 'refactor must not rename exported handlers');
      assert.equal(output.structure_only, true, 'refactor must be structure-only');
    },
  },

  {
    id: 'fw-app-dev-35',
    skill: 'fw-app-dev',
    label: '2 app folders → prompts user to select which app to refactor',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer says "Refactor to reduce function complexity below 7". There are two app folders in the workspace: ./freshdesk-app/ and ./freshservice-app/, each with their own manifest.json. What should the skill do?',
    schema: {
      type: 'object',
      required: ['prompts_to_select_app', 'refactors_all_without_asking'],
      properties: {
        prompts_to_select_app: { type: 'boolean' },
        refactors_all_without_asking: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.prompts_to_select_app, true, 'must prompt user to select which app to refactor');
      assert.equal(output.refactors_all_without_asking, false, 'must not refactor all apps without asking');
    },
  },

  {
    id: 'fw-app-dev-36',
    skill: 'fw-app-dev',
    label: 'add secure iparam crm_api_key → secure: true, not in frontend JS',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer wants to add a "crm_api_key" installation parameter to a Freshdesk app for a CRM call. It must be kept secret. Should it have "secure: true" in iparams.json, and should it be directly accessible in frontend JavaScript?',
    schema: {
      type: 'object',
      required: ['uses_secure_true', 'accessible_in_frontend_js'],
      properties: {
        uses_secure_true: { type: 'boolean' },
        accessible_in_frontend_js: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.uses_secure_true, true, 'secret iparam must have secure: true');
      assert.equal(output.accessible_in_frontend_js, false, 'secure iparam must not be directly accessible in frontend JS');
    },
  },

  {
    id: 'fw-app-dev-37',
    skill: 'fw-app-dev',
    label: 'add onTicketCreate webhook → correct module event key, handler, invokeTemplate',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer wants to add an onTicketCreate event to a serverless app. The handler should post the ticket subject to a webhook via HTTP. Should the event use $request.invokeTemplate (not $request.post) for the HTTP call, and does the manifest modules block need an event entry for onTicketCreate?',
    schema: {
      type: 'object',
      required: ['uses_invoke_template', 'adds_event_to_manifest', 'uses_request_post'],
      properties: {
        uses_invoke_template: { type: 'boolean' },
        adds_event_to_manifest: { type: 'boolean' },
        uses_request_post: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.uses_invoke_template, true, 'webhook HTTP call must use $request.invokeTemplate');
      assert.equal(output.adds_event_to_manifest, true, 'onTicketCreate must be added to manifest modules events');
      assert.equal(output.uses_request_post, false, 'must not use $request.post for external HTTP');
    },
  },

  // fw-app-dev-38: Crayons CDN must be present in HTML; button implementation uses it
  {
    id: 'fw-app-dev-38',
    skill: 'fw-app-dev',
    label: 'add Refresh button → Crayons CDN must be included in HTML (skill rule 8)',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'According to the fw-app-dev skill rule 8: "Vanilla opt-in: app/styles/images/icon.svg + Crayons CDN in HTML (see templates)." When adding a button to a vanilla JS (non-React) Freshdesk sidebar app, must the HTML file include the Crayons CDN script tag (includes_crayons_cdn = true)?',
    schema: {
      type: 'object',
      required: ['includes_crayons_cdn'],
      properties: {
        includes_crayons_cdn: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.includes_crayons_cdn, true, 'HTML must include the Crayons CDN script tag per skill rule 8');
    },
  },

  {
    id: 'fw-app-dev-39',
    skill: 'fw-app-dev',
    label: 'add "Last synced" label → preserves tracking_id / start_time in .meta.json',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer wants to add a "Last synced at ..." label to the sidebar. The app already has tracking_id and start_time fields in its .meta.json. When editing the app to add this UI label, should those .meta.json fields be preserved?',
    schema: {
      type: 'object',
      required: ['preserves_tracking_id', 'overwrites_meta_json'],
      properties: {
        preserves_tracking_id: { type: 'boolean' },
        overwrites_meta_json: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.preserves_tracking_id, true, 'must preserve tracking_id and start_time when editing the app');
      assert.equal(output.overwrites_meta_json, false, 'must not overwrite or clear .meta.json tracking fields');
    },
  },

  {
    id: 'fw-app-dev-40',
    skill: 'fw-app-dev',
    label: '2 app folders → "add sync button" → asks which app before editing',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'The fw-app-dev skill states: "When ambiguous, pick one reasonable interpretation and implement it, or ask only when critical." Developer says "Add a Sync to CRM button to my Freshdesk app". There are two app folders in the workspace: ./freshdesk-app/ and ./crm-app/ — each has its own manifest.json. Editing the wrong folder would break the other app. Is this a critical disambiguation case where the skill must ask which app to edit (asks_which_app = true) rather than silently editing without asking (edits_without_asking = false)?',
    schema: {
      type: 'object',
      required: ['asks_which_app', 'edits_without_asking'],
      properties: {
        asks_which_app: { type: 'boolean' },
        edits_without_asking: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.asks_which_app, true, 'must ask which app to edit when multiple app folders exist');
      assert.equal(output.edits_without_asking, false, 'must not edit any app before user selects the target');
    },
  },

  {
    id: 'fw-app-dev-41',
    skill: 'fw-app-dev',
    label: 'update README with new Sync to CRM feature → Features/Usage updated, no extra report files',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer says "Update the README with the new Sync to CRM feature". Should the skill update the Features/Usage section in README.md, and should it create any additional report files such as CHANGELOG.md or APPS-SUMMARY.md?',
    schema: {
      type: 'object',
      required: ['updates_readme_features', 'creates_extra_report_files'],
      properties: {
        updates_readme_features: { type: 'boolean' },
        creates_extra_report_files: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.updates_readme_features, true, 'must update Features/Usage section in README.md');
      assert.equal(output.creates_extra_report_files, false, 'must not create extra report files like CHANGELOG.md or APPS-SUMMARY.md');
    },
  },

  {
    id: 'fw-app-dev-42',
    skill: 'fw-app-dev',
    label: 'add onAppInstall email validation → handler added only if iparams non-empty',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'The fw-app-dev skill states: "Lifecycle: Non-empty iparams → onAppInstall" and "onAppInstall guard: When iparams exist, add onAppInstall handler; inside the handler, guard with non-empty iparams before validation logic (e.g. if (args.iparams && Object.keys(args.iparams).length > 0) { ... })". Developer wants to add email validation that runs on app install. The app has iparams defined in iparams.json. Should the onAppInstall handler be added (adds_on_app_install_handler = true), and should the handler guard against empty iparams before running validation (handles_empty_iparams = true)?',
    schema: {
      type: 'object',
      required: ['adds_on_app_install_handler', 'handles_empty_iparams'],
      properties: {
        adds_on_app_install_handler: { type: 'boolean' },
        handles_empty_iparams: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.adds_on_app_install_handler, true, 'must add onAppInstall handler for install-time validation');
      assert.equal(output.handles_empty_iparams, true, 'handler must guard against empty iparams');
    },
  },

  {
    id: 'fw-app-dev-43',
    skill: 'fw-app-dev',
    label: 'scope creep: multiple large feature requests at once → asks which to prioritize',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'According to the fw-app-dev skill: Developer says "Add a Sync to CRM button, full Slack notifications with OAuth, and also build a full-page analytics dashboard — all in this session." Should the skill attempt to implement all three at once (implements_all_at_once = true), or ask the developer which to tackle first (asks_to_prioritize = true)?',
    schema: {
      type: 'object',
      required: ['implements_all_at_once', 'asks_to_prioritize'],
      properties: {
        implements_all_at_once: { type: 'boolean' },
        asks_to_prioritize: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.implements_all_at_once, false, 'must not blindly implement all features simultaneously');
      assert.equal(output.asks_to_prioritize, true, 'must ask developer which feature to tackle first');
    },
  },

  // fw-app-dev-45: migrate request on already-Platform-3.0 app → skip migration (CSV 10.3)
  {
    id: 'fw-app-dev-45',
    skill: 'fw-app-dev',
    label: 'app already Platform 3.0 → skip fdk-migrate, focus on engines and validation only',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer says "Migrate this app to Platform 3.0." The manifest.json already has platform-version: "3.0" and uses modules (not product). According to the fw-app-dev skill: should the skill skip fdk-migrate (runs_fdk_migrate=false) and instead focus only on fixing engines and running fdk validate (fixes_engines_and_validates=true)?',
    schema: {
      type: 'object',
      required: ['runs_fdk_migrate', 'fixes_engines_and_validates'],
      properties: {
        runs_fdk_migrate: { type: 'boolean' },
        fixes_engines_and_validates: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.runs_fdk_migrate, false, 'must NOT run fdk-migrate on an app already at Platform 3.0');
      assert.equal(output.fixes_engines_and_validates, true, 'must still check engines and run fdk validate');
    },
  },

  // fw-app-dev-46: add request template → requests.json + invokeTemplate (CSV A.3)
  {
    id: 'fw-app-dev-46',
    skill: 'fw-app-dev',
    label: 'add getAccount request template to existing hybrid app → config/requests.json + $request.invokeTemplate',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer says "Add a getAccount request template to the syncTicket server method in my existing hybrid Freshdesk app." According to the fw-app-dev skill: should the template definition go in config/requests.json (adds_to_requests_json=true), and should the server method call it via $request.invokeTemplate (uses_invoke_template=true) rather than a direct HTTP call?',
    schema: {
      type: 'object',
      required: ['adds_to_requests_json', 'uses_invoke_template', 'uses_direct_http_call'],
      properties: {
        adds_to_requests_json: { type: 'boolean' },
        uses_invoke_template: { type: 'boolean' },
        uses_direct_http_call: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.adds_to_requests_json, true, 'request template must be defined in config/requests.json');
      assert.equal(output.uses_invoke_template, true, 'server handler must call the template via $request.invokeTemplate');
      assert.equal(output.uses_direct_http_call, false, 'must not use direct HTTP calls (axios, fetch, node-request)');
    },
  },

  // fw-app-dev-47: secure iparam → secure:true, no secret in frontend (CSV A.4)
  {
    id: 'fw-app-dev-47',
    skill: 'fw-app-dev',
    label: 'add secure CRM API key iparam → secure:true in iparams.json, no secret in frontend JS',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer says "Add a secure iparam crm_api_key for CRM API calls." According to the fw-app-dev skill: should the skill add the iparam with secure:true (adds_secure_true=true), and must it ensure the API key never appears in frontend JavaScript files (no_secret_in_frontend=true)?',
    schema: {
      type: 'object',
      required: ['adds_secure_true', 'no_secret_in_frontend'],
      properties: {
        adds_secure_true: { type: 'boolean' },
        no_secret_in_frontend: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.adds_secure_true, true, 'secure iparam must have secure:true in iparams.json');
      assert.equal(output.no_secret_in_frontend, true, 'API key must not be referenced or exposed in frontend JS');
    },
  },

  {
    id: 'fw-app-dev-44',
    skill: 'fw-app-dev',
    label: 'add sync button to existing hybrid app → SMI, server method, manifest — no new app folder',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer has an existing hybrid Freshdesk app and says "Add a Sync to CRM button that calls a server method syncTicket." Should the skill: (1) edit the existing app files rather than creating a new app folder, (2) add a server-side SMI method syncTicket, and (3) update the manifest to declare the new function?',
    schema: {
      type: 'object',
      required: ['edits_existing_app', 'adds_smi_method', 'updates_manifest'],
      properties: {
        edits_existing_app: { type: 'boolean' },
        adds_smi_method: { type: 'boolean' },
        updates_manifest: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.edits_existing_app, true, 'must edit the existing app, not create a new folder');
      assert.equal(output.adds_smi_method, true, 'must add an SMI server method (syncTicket)');
      assert.equal(output.updates_manifest, true, 'must update the manifest to declare the new function');
    },
  },

  // fw-app-dev-48: CSV 8.7 — fdk missing → STOP, offer y/n, no files if developer declines
  {
    id: 'fw-app-dev-48',
    skill: 'fw-app-dev',
    label: 'CSV 8.7: fdk missing → STOP, offer /fw-setup-install y/n, no app files created if declined',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'According to the fw-app-dev skill: fdk is missing and the developer asks to build a new app. The skill offers to run /fw-setup-install and the developer answers "n" (declines). Should the skill create no app files (creates_no_files_on_decline = true) and never silently install fdk without consent (no_silent_install = true)?',
    schema: {
      type: 'object',
      required: ['creates_no_files_on_decline', 'no_silent_install'],
      properties: {
        creates_no_files_on_decline: { type: 'boolean' },
        no_silent_install: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.creates_no_files_on_decline, true, 'must not create any app files when developer declines fdk install');
      assert.equal(output.no_silent_install, true, 'must never silently install fdk without explicit developer consent');
    },
  },

  // fw-app-dev-49: Meta-default routing — React Meta unless user explicitly opts into vanilla Crayons
  {
    id: 'fw-app-dev-49',
    skill: 'fw-app-dev',
    label: 'new UI app defaults to React Meta unless user explicitly opts into vanilla Crayons',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer asks: "Build a Freshdesk ticket sidebar app." They did NOT mention vanilla JS or Crayons. According to fw-app-dev: should the default path be React Meta (/fdk-react-create or react-meta skeletons), and should vanilla Crayons only be used when explicitly requested?',
    schema: {
      type: 'object',
      required: ['defaults_to_react_meta', 'vanilla_only_when_explicit'],
      properties: {
        defaults_to_react_meta: { type: 'boolean' },
        vanilla_only_when_explicit: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.defaults_to_react_meta, true, 'new UI apps must default to React Meta');
      assert.equal(output.vanilla_only_when_explicit, true, 'vanilla Crayons is opt-in only');
    },
  },

  // fw-app-dev-50: explicit vanilla opt-in — frontend-skeleton, not /fdk-react-create
  {
    id: 'fw-app-dev-50',
    skill: 'fw-app-dev',
    label: 'explicit vanilla JS / Crayons request → vanilla skeletons, not React Meta',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer asks: "Build a Freshdesk sidebar app using vanilla JavaScript and Crayons components — no React." According to fw-app-dev: should /fdk-react-create or react-meta skeletons be used, or should the agent use vanilla frontend/hybrid/oauth skeletons with app/scripts/app.js and Crayons CDN?',
    schema: {
      type: 'object',
      required: ['uses_vanilla_skeleton', 'avoids_react_meta'],
      properties: {
        uses_vanilla_skeleton: { type: 'boolean' },
        avoids_react_meta: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.uses_vanilla_skeleton, true, 'explicit vanilla request must use vanilla skeletons');
      assert.equal(output.avoids_react_meta, true, 'must not scaffold React Meta when vanilla is explicitly requested');
    },
  },

  // fw-app-dev-51: custom React Settings → iparams.html skeleton, not iparams.json alone
  {
    id: 'fw-app-dev-51',
    skill: 'fw-app-dev',
    label: 'custom React Settings page → iparams.html skeleton, remove iparams.json',
    loadContent: () => loadSkill('fw-app-dev'),
    prompt: 'Developer asks: "Build a React Meta app with a custom installation Settings page — custom form UI with client-side validation, not the default iparams.json fields." According to fw-app-dev: should the agent use config/iparams.html with React under config/assets/ (react-meta-custom-iparams-skeleton), remove config/iparams.json, and include react-error-boundary for the iparams mount?',
    schema: {
      type: 'object',
      required: ['uses_iparams_html', 'removes_iparams_json', 'uses_custom_iparams_skeleton'],
      properties: {
        uses_iparams_html: { type: 'boolean' },
        removes_iparams_json: { type: 'boolean' },
        uses_custom_iparams_skeleton: { type: 'boolean' },
        explanation: { type: 'string' },
      },
    },
    assert(output) {
      assert.equal(output.uses_iparams_html, true, 'custom Settings must use config/iparams.html');
      assert.equal(output.removes_iparams_json, true, 'must not keep iparams.json alongside iparams.html');
      assert.equal(output.uses_custom_iparams_skeleton, true, 'must use react-meta-custom-iparams-skeleton or equivalent');
    },
  },

];
