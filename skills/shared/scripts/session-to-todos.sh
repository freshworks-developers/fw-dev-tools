#!/usr/bin/env bash
# Render <app-dir>/.fw-session.json as a progress checklist for the active intent.
# Usage: session-to-todos.sh <app-dir> [--json]
#   default  -> markdown checklist, ready to paste straight into a reply
#   --json   -> [{content,status}] array, for clients with a TodoWrite-style tool
# Prints nothing (markdown) / [] (json) when there is no session or the intent
# has no checklist. Exit 2 on corrupt session.

set -euo pipefail

APP_DIR="${1:-}"
[ -z "$APP_DIR" ] && { echo "Usage: session-to-todos.sh <app-dir> [--json]" >&2; exit 1; }
shift

FORMAT="markdown"
while [ $# -gt 0 ]; do
  case "$1" in
    --json) FORMAT="json"; shift ;;
    --markdown) FORMAT="markdown"; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

SESSION="$APP_DIR/.fw-session.json"

if [ ! -f "$SESSION" ]; then
  [ "$FORMAT" = "json" ] && echo "[]"
  exit 0
fi

export SESSION FORMAT
node <<'NODE'
const fs = require('fs');

let doc;
try {
  doc = JSON.parse(fs.readFileSync(process.env.SESSION, 'utf8'));
} catch (e) {
  process.stderr.write('Invalid .fw-session.json: ' + e.message + '\n');
  process.exit(2);
}

const PHASE_ORDER = ['discover', 'setup', 'build', 'validate', 'review', 'publish', 'done'];
const phase = doc.progress?.phase;
const at = PHASE_ORDER.indexOf(phase);
const past = (p) => at > PHASE_ORDER.indexOf(p);
const milestones = new Set(doc.progress?.milestones || []);
const has = (m) => milestones.has(m);

// completed > in_progress > pending, expressed as (doneWhen, activeWhen) pairs.
const state = (doneWhen, activeWhen) =>
  doneWhen ? 'completed' : activeWhen ? 'in_progress' : 'pending';

// Each intent gets its own checklist shape; publish-status is read-only and gets none.
function checklist(intent) {
  switch (intent) {
    case 'create-new':
    case 'add-feature':
    case 'update-existing': {
      const published = phase === 'done' || Boolean(doc.publish?.tracking_id);
      return [
        ['Preparing your workspace', state(has('setup_complete') || past('setup'), phase === 'discover' || phase === 'setup')],
        ['Building your app', state(has('validate_passed') || past('build'), phase === 'build')],
        ['Checking your app', state(has('validate_passed'), phase === 'validate')],
        ['Reviewing quality', state(has('review_passed'), phase === 'review')],
        ['Submitting to marketplace', state(published, phase === 'publish')],
      ];
    }

    case 'migrate':
      // Migrate reuses build/validate and ends on migrate_complete, not phase: done.
      return [
        ['Checking your toolchain', state(has('migrate_complete') || has('validate_passed') || past('setup'), phase === 'discover' || phase === 'setup')],
        ['Migrating your app', state(has('migrate_complete') || has('validate_passed') || past('build'), phase === 'build')],
        ['Checking your app', state(has('validate_passed'), phase === 'validate')],
        ['Migration complete', state(has('migrate_complete'), false)],
      ];

    case 'troubleshoot': {
      // Variable length: 1 + one item per attempt + a tail (next try / escalate / resolved).
      const MAX_FIX_ATTEMPTS = 3; // §escalation limit
      const attempts = doc.escalation?.fix_attempt_count ?? 0;
      const signature = doc.escalation?.last_error_signature;
      const items = [['Reproducing the error', state(Boolean(signature), !signature)]];
      for (let n = 1; n <= attempts; n++) {
        items.push([`Attempt ${n} — applying a fix`, 'completed']);
      }
      if (has('validate_passed')) {
        items.push(['Fix confirmed — re-validating', 'completed']);
      } else if (signature) {
        items.push(
          attempts >= MAX_FIX_ATTEMPTS
            ? ['Escalating — needs your input', 'in_progress']
            : [`Attempt ${attempts + 1} — trying a fix`, 'in_progress']
        );
      }
      return items;
    }

    default:
      return [];
  }
}

const todos = checklist(doc.intent).map(([content, status]) => ({ content, status }));

if (process.env.FORMAT === 'json') {
  process.stdout.write(JSON.stringify(todos));
  process.exit(0);
}

if (todos.length === 0) process.exit(0);

const lines = ['**Progress**'];
for (const { content, status } of todos) {
  const box = status === 'completed' ? '[x]' : '[ ]';
  lines.push(`- ${box} ${content}${status === 'in_progress' ? '  ← current' : ''}`);
}
process.stdout.write(lines.join('\n') + '\n');
NODE
