'use strict';
const path = require('path');
const fs = require('fs');
const { 
  detectAiTools, detectTechStack, detectExistingInstall, detectProjectInfo 
} = require('../detect');
const { log, resolveToolPath, fileExists, getDirContents, readJson } = require('../utils');

async function run(args) {
  const targetDir = process.cwd();
  const verbose = args && args.includes('--verbose');
  const jsonOutput = args && args.includes('--json');
  
  const projectInfo = detectProjectInfo(targetDir);
  const installInfo = detectExistingInstall(targetDir);
  
  if (jsonOutput) {
    console.log(JSON.stringify({
      project: projectInfo,
      installed: installInfo,
      timestamp: new Date().toISOString()
    }, null, 2));
    return;
  }

  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║            AI-Flow Status Report                ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  console.log(`Project:     ${projectInfo.name}`);
  console.log(`Version:     ${projectInfo.version}`);
  console.log(`Path:        ${targetDir}`);
  console.log(`AI Tools:    ${projectInfo.aiTools.join(', ')}`);
  console.log(`Tech Stack:  ${projectInfo.techStack}`);
  if (projectInfo.packageManager) {
    console.log(`PackageMgr:  ${projectInfo.packageManager}`);
  }

  if (installInfo.installed) {
    console.log(`\n✅ AI-Flow is installed (v${installInfo.version})`);
    if (installInfo.installedAt) {
      console.log(`   Installed: ${new Date(installInfo.installedAt).toLocaleString()}`);
    }
    if (installInfo.lastSynced) {
      console.log(`   Last sync: ${new Date(installInfo.lastSynced).toLocaleString()}`);
    }
  } else {
    console.log(`\n❌ AI-Flow is not installed`);
    console.log(`   Run "npx ai-flow init" to install`);
  }

  for (const tool of projectInfo.aiTools) {
    const toolDir = resolveToolPath(targetDir, tool);
    
    console.log(`\n📂 ${tool}:`);
    console.log(`   Path: ${toolDir}`);
    
    const subdirs = ['skills', 'agents', 'commands', 'workflows', 'rules', 'references'];
    for (const dir of subdirs) {
      const dirPath = path.join(toolDir, dir);
      if (fileExists(dirPath)) {
        const items = getDirContents(dirPath);
        const dirInfo = items.map(i => i.name).slice(0, verbose ? items.length : 5);
        const more = items.length > 5 && !verbose ? ` (+${items.length - 5} more)` : '';
        console.log(`   ${dir}: ${items.length} items${items.length > 0 ? ` [${dirInfo.join(', ')}]${more}` : ''}`);
      } else {
        console.log(`   ${dir}: (not found)`);
      }
    }
    
    if (verbose) {
      const settingsPath = path.join(toolDir, 'settings.json');
      if (fileExists(settingsPath)) {
        const settings = readJson(settingsPath);
        console.log(`   settings.json: ${JSON.stringify(settings, null, 4).split('\n').map(l => '   ' + l).join('\n').substring(3)}`);
      }
    }
  }

  console.log('\n💡 Quick commands:');
  console.log('   npx ai-flow init       - Initialize project');
  console.log('   npx ai-flow --sync     - Sync configurations');
  console.log('   npx ai-flow <feature>  - Start a feature');
  console.log('');
}

module.exports = { run };
