'use strict';
const fs = require('fs');
const path = require('path');
const PKG_ROOT = path.join(__dirname, '..');

function log(msg) { console.log(`[ai-flow] ${msg}`); }

function resolveToolPath(targetDir, tool) {
  const toolMap = {
    'claude-code': '.claude',
    'opencode': '.opencode',
    'cursor': '.cursor',
    'hermes': '.hermes',
    'trae': '.trae',
  };
  return path.join(targetDir, toolMap[tool] || '.claude');
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(srcPath, destPath) : fs.copyFileSync(srcPath, destPath);
  }
}

function fileExists(filePath) { return fs.existsSync(filePath); }
function readJson(filePath) { return fileExists(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : null; }
function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}
function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
function appendText(filePath, content) {
  const dir = path.dirname(filePath);
  if (dir) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(filePath, content);
}
function getPkgRoot() { return PKG_ROOT; }

module.exports = { log, resolveToolPath, copyDir, fileExists, readJson, writeJson, writeText, appendText, getPkgRoot };
