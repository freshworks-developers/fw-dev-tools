#!/usr/bin/env bash
# Merge fields into <app-dir>/.fw-session.json and set updated_at (ISO8601 UTC).
# Usage: session-write.sh <app-dir> [--merge-json '{...}'] [key=value ...]
#   Nested keys: progress.phase=validate, publish.tracking_id=trk-1

set -euo pipefail

APP_DIR="${1:-}"
shift || true
[ -z "$APP_DIR" ] && { echo "Usage: session-write.sh <app-dir> [--merge-json '{...}'] [key=value ...]" >&2; exit 1; }

SESSION="$APP_DIR/.fw-session.json"
MERGE_JSON="{}"
ASSIGNMENTS=()
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

while [ $# -gt 0 ]; do
  case "$1" in
    --merge-json)
      MERGE_JSON="${2:-}"
      shift 2
      ;;
    *=*)
      ASSIGNMENTS+=("$1")
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [ "${#ASSIGNMENTS[@]}" -eq 0 ]; then
  ASSIGNMENTS_JSON="$(node -e "
  process.stdout.write('{}');
")"
else
  ASSIGNMENTS_JSON="$(node -e "
  const args = process.argv.slice(1);
  const out = {};
  for (const arg of args) {
    const i = arg.indexOf('=');
    if (i === -1) continue;
    out[arg.slice(0, i)] = arg.slice(i + 1);
  }
  process.stdout.write(JSON.stringify(out));
" "${ASSIGNMENTS[@]}")"
fi
export SESSION MERGE_JSON ASSIGNMENTS_JSON SCRIPT_DIR

node <<'NODE'
const fs = require('fs');
const path = require('path');

const sessionPath = process.env.SESSION;
const scriptDir = process.env.SCRIPT_DIR;

function readJsonEnv(name) {
  try {
    return JSON.parse(process.env[name] || '{}');
  } catch (e) {
    console.error(`${name} must be valid JSON: ${e.message}`);
    process.exit(1);
  }
}

const mergeJson = readJsonEnv('MERGE_JSON');
const assignments = readJsonEnv('ASSIGNMENTS_JSON');

const INTENT_ALIASES = {
  create: 'create-new',
  update: 'update-existing',
};

function normalizeAliases(obj) {
  if (obj && typeof obj.intent === 'string' && INTENT_ALIASES[obj.intent]) {
    obj.intent = INTENT_ALIASES[obj.intent];
  }
}

function setNested(obj, dotted, value) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function mergeDeep(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value) && isPlainObject(target[key])) {
      mergeDeep(target[key], value);
    } else if (key === 'milestones' && Array.isArray(value) && Array.isArray(target[key])) {
      target[key] = Array.from(new Set([...target[key], ...value]));
    } else {
      target[key] = value;
    }
  }
  return target;
}

function resolveSchemaPath() {
  const candidates = [
    path.resolve(scriptDir, '..', '..', '..', 'specs', 'fw-session.schema.json'),
    path.resolve(scriptDir, '..', 'references', 'fw-session-schema.json'),
    path.resolve(scriptDir, '..', 'specs', 'fw-session.schema.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  console.error('fw-session schema not found; refusing to write session');
  process.exit(1);
}

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function validateValue(value, subSchema, currentPath = '$') {
  const errors = [];

  if (subSchema.type) {
    const actual = typeOf(value);
    if (subSchema.type === 'integer') {
      if (actual !== 'number' || !Number.isInteger(value)) {
        errors.push(`${currentPath}: expected integer, got ${actual}`);
        return errors;
      }
    } else if (actual !== subSchema.type) {
      errors.push(`${currentPath}: expected ${subSchema.type}, got ${actual}`);
      return errors;
    }
  }

  if (subSchema.enum && !subSchema.enum.includes(value)) {
    errors.push(`${currentPath}: must be one of ${subSchema.enum.join(', ')}`);
  }

  if (subSchema.pattern && typeof value === 'string' && !(new RegExp(subSchema.pattern)).test(value)) {
    errors.push(`${currentPath}: must match pattern ${subSchema.pattern}`);
  }

  if (subSchema.minimum !== undefined && typeof value === 'number' && value < subSchema.minimum) {
    errors.push(`${currentPath}: must be >= ${subSchema.minimum}`);
  }

  if (subSchema.maximum !== undefined && typeof value === 'number' && value > subSchema.maximum) {
    errors.push(`${currentPath}: must be <= ${subSchema.maximum}`);
  }

  if (subSchema.format === 'date-time' && typeof value === 'string' && Number.isNaN(Date.parse(value))) {
    errors.push(`${currentPath}: must be ISO8601 date-time`);
  }

  if (subSchema.type === 'object' && isPlainObject(value)) {
    if (subSchema.additionalProperties === false && subSchema.properties) {
      for (const key of Object.keys(value)) {
        if (!subSchema.properties[key]) {
          errors.push(`${currentPath}.${key}: additional property not allowed`);
        }
      }
    }
    for (const key of subSchema.required || []) {
      if (!(key in value)) {
        errors.push(`${currentPath}: missing required property "${key}"`);
      }
    }
    for (const [key, propSchema] of Object.entries(subSchema.properties || {})) {
      if (key in value) {
        errors.push(...validateValue(value[key], propSchema, `${currentPath}.${key}`));
      }
    }
  }

  if (subSchema.type === 'array' && Array.isArray(value) && subSchema.items) {
    value.forEach((item, i) => {
      errors.push(...validateValue(item, subSchema.items, `${currentPath}[${i}]`));
    });
  }

  return errors;
}

let doc = {};
if (fs.existsSync(sessionPath)) {
  try {
    doc = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  } catch (e) {
    console.error('Corrupt .fw-session.json — fix or run session-reset.sh --force');
    process.exit(2);
  }
} else {
  doc = {
    schema_version: '1.0.0',
    intent: assignments.intent || mergeJson.intent || 'create-new',
    progress: { phase: 'discover' },
  };
}

normalizeAliases(assignments);
normalizeAliases(mergeJson);

mergeDeep(doc, mergeJson);
for (const [k, v] of Object.entries(assignments)) {
  if (k.includes('.')) setNested(doc, k, v);
  else doc[k] = v;
}
normalizeAliases(doc);

if (!doc.schema_version) doc.schema_version = '1.0.0';
if (!doc.progress) doc.progress = { phase: 'discover' };
if (!doc.intent) {
  console.error('First session write requires intent= (e.g. intent=create-new)');
  process.exit(1);
}

doc.updated_at = new Date().toISOString();
doc.last_milestone_at = doc.updated_at;

const milestones = doc.progress.milestones || [];
if (doc.publish && doc.publish.tracking_id && !doc.tracking_id) {
  doc.tracking_id = doc.publish.tracking_id;
}
if (doc.escalation && doc.escalation.fix_attempt_count !== undefined) {
  doc.fix_iteration_count = doc.escalation.fix_attempt_count;
}

if (doc.publish && doc.publish.tracking_id) doc.step = 'published';
else if (milestones.includes('review_passed')) doc.step = 'reviewed';
else if (milestones.includes('validate_passed')) doc.step = 'validated';
else {
  doc.step = 'building';
}

const schema = JSON.parse(fs.readFileSync(resolveSchemaPath(), 'utf8'));
const errors = validateValue(doc, schema);
if (errors.length > 0) {
  console.error(`Invalid .fw-session.json — refusing to write:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
fs.writeFileSync(sessionPath, JSON.stringify(doc, null, 2) + '\n');
// Trailing newline: this is routinely chained with session-to-todos.sh, and
// without it the JSON runs into the checklist's "**Progress**" header.
process.stdout.write(JSON.stringify(doc) + '\n');
NODE
