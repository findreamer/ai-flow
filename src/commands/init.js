'use strict';
const path = require('path');
const fs = require('fs');
const { detectAiTools, detectTechStack, detectExistingInstall } = require('../detect');
const { log, resolveToolPath, copyDir, writeText, appendText, getPkgRoot, readJson, writeJson, fileExists } = require('../utils');

async function run(args) {
  const targetDir = process.cwd();
  const toolFlag = args.includes('--tool') ? args[args.indexOf('--tool') + 1] : null;
  const verbose = args.includes('--verbose');

  log('=== AI-Flow Init ===');
  const aiTools = toolFlag ? [toolFlag] : detectAiTools(targetDir);
  log(`Detected AI tools: ${aiTools.join(', ')}`);
  const techStack = detectTechStack(targetDir);
  log(`Detected tech stack: ${techStack}`);

  const existing = detectExistingInstall(targetDir);
  if (existing.installed) log(`Warning: AI-Flow v${existing.version} already installed. Merging.`);

  const pkgRoot = getPkgRoot();
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'));

  for (const tool of aiTools) {
    const toolDir = resolveToolPath(targetDir, tool);
    ['skills', 'agents', 'commands', 'workflows', 'references'].forEach(d =>
      fs.mkdirSync(path.join(toolDir, d), { recursive: true }));

    copyDir(path.join(pkgRoot, 'skills'), path.join(toolDir, 'skills'));
    log('Installed enterprise skills');

    copyDir(path.join(pkgRoot, 'agents'), path.join(toolDir, 'agents'));
    log('Installed agent definitions');

    copyDir(path.join(pkgRoot, 'commands'), path.join(toolDir, 'commands'));
    log('Installed custom commands');

    copyDir(path.join(pkgRoot, 'workflows'), path.join(toolDir, 'workflows'));
    log('Installed workflow definitions');

    copyDir(path.join(pkgRoot, 'templates', 'references'), path.join(toolDir, 'references'));
    log('Installed reference templates');

    const settingsSrc = path.join(pkgRoot, 'templates', 'settings.json');
    const settingsDest = path.join(toolDir, 'settings.json');
    if (fileExists(settingsSrc) && !fileExists(settingsDest)) {
      const settings = readJson(settingsSrc);
      settings['ai-flow'] = { version: pkg.version, installedAt: new Date().toISOString() };
      writeJson(settingsDest, settings);
      log('Created settings.json from template');
    }

    const rulesSrc = path.join(pkgRoot, 'templates', 'rules');
    if (fileExists(rulesSrc)) {
      copyDir(rulesSrc, path.join(toolDir, 'rules'));
      log('Installed rule templates');
    }

    const presetSrc = path.join(pkgRoot, 'templates', 'presets', techStack);
    if (fileExists(presetSrc)) {
      copyDir(presetSrc, path.join(toolDir, 'rules'));
      log(`Installed ${techStack} preset rules`);
    }

    const ClaudeMdPath = path.join(toolDir, 'CLAUDE.md');
    if (!fileExists(ClaudeMdPath)) {
      writeText(ClaudeMdPath, generateBootstrap(aiTools, techStack));
    } else {
      const existing = fs.readFileSync(ClaudeMdPath, 'utf8');
      if (!existing.includes('# AI-Flow')) appendText(ClaudeMdPath, '\n' + generateBootstrap(aiTools, techStack));
    }
    log('Updated CLAUDE.md bootstrap');

    updateGitignore(targetDir);
    log('Updated .gitignore');
  }

  log(`AI-Flow initialized successfully for: ${aiTools.join(', ')}`);
}

function generateBootstrap(aiTools, techStack) {
  return `# AI-Flow Bootstrap (auto-generated)\n# Generated: ${new Date().toISOString()}\n\nAI Tools: ${aiTools.join(', ')}\nTech Stack: ${techStack}\n`;
}

function updateGitignore(targetDir) {
  const p = path.join(targetDir, '.gitignore');
  const entries = ['# AI-Flow', '.claude/settings.local.json', '.claude/CLAUDE.local.md'];
  let existing = fileExists(p) ? fs.readFileSync(p, 'utf8') : '';
  if (entries.some(e => !existing.includes(e))) {
    fs.writeFileSync(p, existing + '\n' + entries.join('\n') + '\n');
  }
}

module.exports = { run };
