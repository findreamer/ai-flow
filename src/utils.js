'use strict';
const fs = require('fs');
const path = require('path');
const PKG_ROOT = path.join(__dirname, '..');

let VERBOSE_MODE = false;

function log(msg, verboseOnly = false) { 
  if (!verboseOnly || VERBOSE_MODE) {
    console.log(`[ai-flow] ${msg}`); 
  }
}

function setVerbose(verbose) {
  VERBOSE_MODE = verbose;
}

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

function copyDir(src, dest, options = {}) {
  const { overwrite = true, exclude = [] } = options;
  
  if (!fs.existsSync(src)) return;
  
  fs.mkdirSync(dest, { recursive: true });
  
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (exclude.includes(entry.name)) continue;
    
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, options);
    } else if (overwrite || !fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function fileExists(filePath) { 
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function readJson(filePath) { 
  if (!fileExists(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    log(`Warning: Failed to parse JSON file ${filePath}: ${e.message}`, true);
    return null;
  }
}

function writeJson(filePath, data) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    return true;
  } catch (e) {
    log(`Error: Failed to write JSON file ${filePath}: ${e.message}`);
    return false;
  }
}

function writeText(filePath, content) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    return true;
  } catch (e) {
    log(`Error: Failed to write file ${filePath}: ${e.message}`);
    return false;
  }
}

function appendText(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    if (dir) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(filePath, content);
    return true;
  } catch (e) {
    log(`Error: Failed to append to file ${filePath}: ${e.message}`);
    return false;
  }
}

function readText(filePath) {
  if (!fileExists(filePath)) return null;
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    log(`Warning: Failed to read file ${filePath}: ${e.message}`, true);
    return null;
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

function getDirContents(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

function getPkgRoot() { return PKG_ROOT; }

function getPackageJson() {
  return readJson(path.join(PKG_ROOT, 'package.json'));
}

module.exports = { 
  log, setVerbose, resolveToolPath, copyDir, removeDir, 
  fileExists, readJson, writeJson, readText, writeText, appendText,
  ensureDir, getDirContents, getPkgRoot, getPackageJson 
};
