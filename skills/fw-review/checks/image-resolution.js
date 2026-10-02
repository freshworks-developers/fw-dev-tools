'use strict';

const fs = require('fs/promises');
const path = require('path');
const { createRuleResult, runCli } = require('../runners/common');

const RULE_ID = 'FFS-05L';

const IGNORED_DIRECTORIES = new Set([
  '.cache',
  '.cursor',
  '.fdk',
  '.git',
  '.next',
  'build',
  'coverage',
  'dist',
  'node_modules'
]);

const IMAGE_EXTENSIONS = new Set(['.gif', '.ico', '.jpeg', '.jpg', '.png']);
const MIN_ICON_LOGO_SIZE_BYTES = 1024;

// Match freshreview's baseline FFS-05L behavior: inspect icon/logo image files and icon.svg.
async function walkAssetPaths(rootDir) {
  const paths = [];

  async function visit(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name) && !entry.name.startsWith('.')) {
          await visit(fullPath);
        }
        continue;
      }

      if (entry.isFile()) {
        paths.push(fullPath);
      }
    }
  }

  await visit(rootDir);
  return paths;
}

function createDetail(file, message) {
  return { file, message };
}

function createResult(passed, summary, details = []) {
  return createRuleResult(RULE_ID, passed, summary, details);
}

async function getSvgDimensions(filePath) {
  const content = await fs.readFile(filePath, 'utf8').catch(() => null);
  if (!content) {
    return null;
  }

  const widthMatch = content.match(/width\s*=\s*["'](\d+)/);
  const heightMatch = content.match(/height\s*=\s*["'](\d+)/);
  if (!widthMatch || !heightMatch) {
    return null;
  }

  return {
    width: Number.parseInt(widthMatch[1], 10),
    height: Number.parseInt(heightMatch[1], 10)
  };
}

async function run(targetDir) {
  const details = [];
  const assetPaths = await walkAssetPaths(targetDir);
  const imageFiles = assetPaths.filter((filePath) => IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase()));

  for (const filePath of imageFiles) {
    const stats = await fs.stat(filePath).catch(() => null);
    if (!stats) {
      continue;
    }

    const relativePath = path.relative(targetDir, filePath).split(path.sep).join('/');
    if (stats.size > 0 && stats.size < MIN_ICON_LOGO_SIZE_BYTES && /icon|logo/i.test(relativePath)) {
      details.push(createDetail(relativePath, `Image may be too low resolution: ${relativePath} (${stats.size} bytes).`));
    }
  }

  const svgIcon = assetPaths.find((filePath) => /icon\.svg$/i.test(filePath));
  if (svgIcon) {
    const dimensions = await getSvgDimensions(svgIcon);
    if (dimensions && (dimensions.width !== 64 || dimensions.height !== 64)) {
      const relativePath = path.relative(targetDir, svgIcon).split(path.sep).join('/');
      details.push(createDetail(relativePath, `icon.svg must be 64x64 pixels (found ${dimensions.width}x${dimensions.height}).`));
    }
  }

  return details.length === 0
    ? createResult(true, 'Image assets meet the baseline resolution checks.')
    : createResult(false, 'Image assets do not meet the baseline resolution checks.', details);
}

module.exports = { run };

if (require.main === module) {
  runCli(run);
}
