'use strict';
const path = require('path');
const fs = require('fs');
const { detectAiTools } = require('../detect');
const { 
  log, setVerbose, resolveToolPath, fileExists, 
  readJson, writeJson, removeDir, readText, writeText
} = require('../utils');

async function run(args = []) {
  const targetDir = process.cwd();
  const verbose = args && args.includes('--verbose');
  const force = args && args.includes('--force');
  
  setVerbose(verbose);
  
  log('=== AI-Flow Uninstall ===');
  
  const aiTools = detectAiTools(targetDir);
  
  if (!force) {
    log('This will remove AI-Flow configurations.');
    log('Add --force to confirm uninstallation.');
    return;
  }
  
  log('Force uninstall confirmed.');
  
  for (const tool of aiTools) {
    const td = resolveToolPath(targetDir, tool);
    log(`Uninstalling from ${tool}...`);
    
    const toRemove = ['skills', 'agents', 'commands', 'workflows', 'references', 'rules'];
    for (const dir of toRemove) {
      const dp = path.join(td, dir);
      if (fileExists(dp)) {
        removeDir(dp);
        log(`Removed ${dir} → ${tool}`);
      }
    }
    
    const sp = path.join(td, 'settings.json');
    if (fileExists(sp)) {
      const settings = readJson(sp);
      if (settings && settings['ai-flow']) {
        delete settings['ai-flow'];
        writeJson(sp, settings);
        log(`Removed ai-flow section from settings.json → ${tool}`);
      }
    }
    
    const cp = path.join(td, 'CLAUDE.md');
    if (fileExists(cp)) {
      let content = readText(cp);
      const idx = content.indexOf('# AI-Flow Bootstrap');
      if (idx !== -1) {
        let updated = content.slice(0, idx).trimEnd();
        if (updated) {
          writeText(cp, updated + '\n');
        } else {
          fs.unlinkSync(cp);
        }
        log(`Updated CLAUDE.md → ${tool}`);
      }
    }
  }
  
  log('');
  log('AI-Flow uninstalled successfully.');
  log('');
  log('Note: Project files were preserved.');
}

module.exports = { run };
