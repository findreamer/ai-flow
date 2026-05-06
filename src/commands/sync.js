'use strict';
const path = require('path');
const fs = require('fs');
const { detectAiTools } = require('../detect');
const { log, resolveToolPath, copyDir, getPkgRoot, fileExists, readJson, writeJson } = require('../utils');

async function run() {
  const targetDir = process.cwd();
  const pkgRoot = getPkgRoot();
  log('=== AI-Flow Sync ===');
  const aiTools = detectAiTools(targetDir);
  for (const tool of aiTools) {
    const td = resolveToolPath(targetDir, tool);
    ['skills', 'agents', 'commands', 'workflows'].forEach(d => {
      const s = path.join(pkgRoot, d);
      if (fileExists(s)) copyDir(s, path.join(td, d));
    });
    const sp = path.join(td, 'references');
    const rs = path.join(pkgRoot, 'templates', 'references');
    if (fileExists(rs)) copyDir(rs, sp);
    const settingsPath = path.join(td, 'settings.json');
    if (fileExists(settingsPath)) {
      const s = readJson(settingsPath);
      const pkg = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'));
      if (s['ai-flow']) { s['ai-flow'].version = pkg.version; s['ai-flow'].lastSynced = new Date().toISOString(); writeJson(settingsPath, s); }
    }
    log(`Synced → ${tool}`);
  }
  log(`Sync complete for: ${aiTools.join(', ')}`);
}

module.exports = { run };
