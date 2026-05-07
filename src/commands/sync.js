'use strict';
const path = require('path');
const { detectAiTools } = require('../detect');
const { 
  log, resolveToolPath, copyDir, getPkgRoot, 
  fileExists, readJson, writeJson, getPackageJson, removeDir 
} = require('../utils');

async function run(args = []) {
  const targetDir = process.cwd();
  const clean = args && args.includes('--clean');
  const pkgRoot = getPkgRoot();
  
  log('=== AI-Flow Sync ===');
  
  const aiTools = detectAiTools(targetDir);
  
  for (const tool of aiTools) {
    const td = resolveToolPath(targetDir, tool);
    log(`Syncing ${tool}...`);
    
    const syncDirs = ['skills', 'agents', 'commands', 'workflows'];
    for (const d of syncDirs) {
      const s = path.join(pkgRoot, d);
      const dest = path.join(td, d);
      
      if (clean && fileExists(dest)) {
        removeDir(dest);
        log(`Cleaned ${d}...`, true);
      }
      
      if (fileExists(s)) {
        copyDir(s, dest, { overwrite: true });
        log(`Synced ${d}...`, true);
      }
    }
    
    const referencesSrc = path.join(pkgRoot, 'templates', 'references');
    const referencesDest = path.join(td, 'references');
    if (fileExists(referencesSrc)) {
      if (clean && fileExists(referencesDest)) {
        removeDir(referencesDest);
      }
      copyDir(referencesSrc, referencesDest, { overwrite: true });
      log('Synced references...', true);
    }
    
    const rulesSrc = path.join(pkgRoot, 'templates', 'rules');
    const rulesDest = path.join(td, 'rules');
    if (fileExists(rulesSrc)) {
      copyDir(rulesSrc, rulesDest, { overwrite: false });
      log('Synced rules...', true);
    }
    
    const settingsPath = path.join(td, 'settings.json');
    if (fileExists(settingsPath)) {
      const s = readJson(settingsPath);
      const pkg = getPackageJson();
      if (s && s['ai-flow']) { 
        s['ai-flow'].version = pkg.version; 
        s['ai-flow'].lastSynced = new Date().toISOString(); 
        writeJson(settingsPath, s); 
      }
      log('Updated settings...', true);
    }
    
    log(`Synced → ${tool}`);
  }
  
  log('');
  log(`Sync complete for: ${aiTools.join(', ')}`);
  if (clean) {
    log('Clean mode enabled - old directories were removed');
  }
}

module.exports = { run };

