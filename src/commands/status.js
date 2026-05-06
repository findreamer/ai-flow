'use strict';
const path = require('path');
const fs = require('fs');
const { detectAiTools, detectTechStack, detectExistingInstall } = require('../detect');
const { log, resolveToolPath, fileExists } = require('../utils');

async function run() {
  const targetDir = process.cwd();
  const aiTools = detectAiTools(targetDir);
  const techStack = detectTechStack(targetDir);
  console.log('\n=== AI-Flow Status ===\n');
  console.log(`Project: ${targetDir}`);
  console.log(`AI Tools: ${aiTools.join(', ')}`);
  console.log(`Tech Stack: ${techStack}`);
  for (const tool of aiTools) {
    const td = resolveToolPath(targetDir, tool);
    const info = detectExistingInstall(targetDir);
    console.log(`\n${tool}: ${info.installed ? 'installed (v' + info.version + ')' : 'not installed'}`);
    ['skills', 'agents', 'commands', 'workflows', 'references', 'rules'].forEach(d => {
      const dp = path.join(td, d);
      console.log(`  ${d}: ${fileExists(dp) ? fs.readdirSync(dp).length + ' items' : '(not found)'}`);
    });
  }
  console.log('');
}

module.exports = { run };
