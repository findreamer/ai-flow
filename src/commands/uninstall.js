'use strict';
const path = require('path');
const fs = require('fs');
const { detectAiTools } = require('../detect');
const { log, resolveToolPath, fileExists, readJson, writeJson } = require('../utils');

async function run() {
  const targetDir = process.cwd();
  log('=== AI-Flow Uninstall ===');
  for (const tool of detectAiTools(targetDir)) {
    const td = resolveToolPath(targetDir, tool);
    ['skills', 'agents', 'commands', 'workflows', 'references', 'rules'].forEach(d => {
      const dp = path.join(td, d);
      if (fileExists(dp)) { fs.rmSync(dp, { recursive: true, force: true }); log(`Removed ${d} → ${tool}`); }
    });
    const sp = path.join(td, 'settings.json');
    if (fileExists(sp)) { const s = readJson(sp); if (s && s['ai-flow']) { delete s['ai-flow']; writeJson(sp, s); } }
    const cp = path.join(td, 'CLAUDE.md');
    if (fileExists(cp)) {
      let c = fs.readFileSync(cp, 'utf8');
      const i = c.indexOf('# AI-Flow Bootstrap');
      if (i !== -1) { c = c.slice(0, i).trimEnd(); c ? fs.writeFileSync(cp, c + '\n') : fs.unlinkSync(cp); }
    }
  }
  log('AI-Flow uninstalled.');
}

module.exports = { run };
