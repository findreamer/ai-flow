'use strict';
const path = require('path');
const fs = require('fs');
const { 
  detectAiTools, detectTechStack, detectExistingInstall, detectProjectInfo 
} = require('../detect');
const { 
  log, setVerbose, resolveToolPath, copyDir, writeText, 
  appendText, getPkgRoot, readJson, writeJson, fileExists,
  ensureDir, getPackageJson
} = require('../utils');

async function run(args) {
  const targetDir = process.cwd();
  const toolFlagIndex = args.indexOf('--tool');
  const toolFlag = toolFlagIndex !== -1 ? args[toolFlagIndex + 1] : null;
  const verbose = args.includes('--verbose');
  const force = args.includes('--force');

  setVerbose(verbose);
  
  log('=== AI-Flow Init ===');
  
  const projectInfo = detectProjectInfo(targetDir);
  const aiTools = toolFlag ? [toolFlag] : projectInfo.aiTools;
  
  log(`Detected AI tools: ${aiTools.join(', ')}`);
  log(`Detected tech stack: ${projectInfo.techStack}`);
  log(`Project: ${projectInfo.name} v${projectInfo.version}`);

  const existing = detectExistingInstall(targetDir);
  if (existing.installed && !force) {
    log(`Warning: AI-Flow v${existing.version} already installed. Use --force to reinitialize.`);
    log('Proceeding with merge mode...');
  } else if (existing.installed && force) {
    log('Force reinitialization - overwriting existing files');
  }

  const pkgRoot = getPkgRoot();
  const pkg = getPackageJson();

  for (const tool of aiTools) {
    const toolDir = resolveToolPath(targetDir, tool);
    log(`Setting up for ${tool}...`, true);

    const requiredDirs = ['skills', 'agents', 'commands', 'workflows', 'references'];
    requiredDirs.forEach(d => ensureDir(path.join(toolDir, d)));

    copyDir(path.join(pkgRoot, 'skills'), path.join(toolDir, 'skills'), { overwrite: force });
    log('Installed enterprise skills');

    copyDir(path.join(pkgRoot, 'agents'), path.join(toolDir, 'agents'), { overwrite: force });
    log('Installed agent definitions');

    copyDir(path.join(pkgRoot, 'commands'), path.join(toolDir, 'commands'), { overwrite: force });
    log('Installed custom commands');

    copyDir(path.join(pkgRoot, 'workflows'), path.join(toolDir, 'workflows'), { overwrite: force });
    log('Installed workflow definitions');

    copyDir(path.join(pkgRoot, 'templates', 'references'), path.join(toolDir, 'references'), { overwrite: force });
    log('Installed reference templates');

    const settingsSrc = path.join(pkgRoot, 'templates', 'settings.json');
    const settingsDest = path.join(toolDir, 'settings.json');
    if (fileExists(settingsSrc) && (force || !fileExists(settingsDest))) {
      const settings = readJson(settingsSrc) || {};
      settings['ai-flow'] = { 
        version: pkg.version, 
        installedAt: new Date().toISOString(),
        projectName: projectInfo.name,
        techStack: projectInfo.techStack
      };
      writeJson(settingsDest, settings);
      log('Created/updated settings.json');
    }

    const rulesSrc = path.join(pkgRoot, 'templates', 'rules');
    if (fileExists(rulesSrc)) {
      copyDir(rulesSrc, path.join(toolDir, 'rules'), { overwrite: force });
      log('Installed rule templates');
    }

    if (projectInfo.techStack !== 'unknown') {
      const presetSrc = path.join(pkgRoot, 'templates', 'presets', projectInfo.techStack);
      if (fileExists(presetSrc)) {
        copyDir(presetSrc, path.join(toolDir, 'rules'), { overwrite: force });
        log(`Installed ${projectInfo.techStack} preset rules`);
      }
    }

    const templateClaudePath = path.join(pkgRoot, 'templates', 'CLAUDE.md');
    const ClaudeMdPath = path.join(toolDir, 'CLAUDE.md');
    if (!fileExists(ClaudeMdPath)) {
      const baseContent = fileExists(templateClaudePath)
        ? fs.readFileSync(templateClaudePath, 'utf8')
        : '';
      writeText(ClaudeMdPath, baseContent + (baseContent ? '\n' : '') + generateBootstrap(projectInfo));
    } else {
      const existing = fs.readFileSync(ClaudeMdPath, 'utf8');
      if (!existing.includes('# AI-Flow Bootstrap')) {
        appendText(ClaudeMdPath, '\n' + generateBootstrap(projectInfo));
      }
    }
    log('Updated CLAUDE.md bootstrap');

    updateGitignore(targetDir);
    log('Updated .gitignore');
  }

  log(`AI-Flow initialized successfully for: ${aiTools.join(', ')}`);
  log('');
  log('Next steps:');
  log('  1. Review .claude/settings.json and customize if needed');
  log('  2. Check .claude/workflows/feature-development.yaml');
  log('  3. Run "npx aiflow <feature-name>" to start developing');
}

function generateBootstrap(projectInfo) {
  return `# AI-Flow Bootstrap (auto-generated)
# Generated: ${new Date().toISOString()}
# 
# AI Tools: ${projectInfo.aiTools.join(', ')}
# Tech Stack: ${projectInfo.techStack}
# Project: ${projectInfo.name}

## Getting Started
- Initialize: npx ai-flow init
- Start feature: npx aiflow "feature name"
- Sync configs: npx ai-flow --sync
- Check status: npx ai-flow --status

## Project Configuration
This file is auto-generated but can be extended with project-specific instructions.
`;
}

function updateGitignore(targetDir) {
  const p = path.join(targetDir, '.gitignore');
  const entries = [
    '# AI-Flow',
    '.claude/settings.local.json',
    '.claude/CLAUDE.local.md',
    '.opencode/settings.local.json',
    '.cursor/settings.local.json',
    '.trae/settings.local.json',
    '.hermes/settings.local.json',
    '.aider/settings.local.json'
  ];
  
  let existing = fileExists(p) ? fs.readFileSync(p, 'utf8') : '';
  const missingEntries = entries.filter(e => !existing.includes(e));
  
  if (missingEntries.length > 0) {
    const separator = existing && !existing.endsWith('\n') ? '\n' : '';
    fs.writeFileSync(p, existing + separator + missingEntries.join('\n') + '\n');
  }
}

module.exports = { run };

