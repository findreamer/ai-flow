'use strict';
const fs = require('fs');
const path = require('path');
const { fileExists, readJson } = require('./utils');

const AI_TOOLS = [
  { name: 'claude-code', marker: '.claude' },
  { name: 'opencode', marker: '.opencode' },
  { name: 'cursor', marker: '.cursor' },
  { name: 'hermes', marker: '.hermes' },
  { name: 'trae', marker: '.trae' },
  { name: 'aider', marker: '.aider' },
];

const TECH_STACKS = [
  { name: 'typescript', marker: 'package.json', checker: (p) => p && (p.dependencies?.typescript || p.devDependencies?.typescript) },
  { name: 'python', marker: 'pyproject.toml' },
  { name: 'python', marker: 'requirements.txt' },
  { name: 'python', marker: 'setup.py' },
  { name: 'python', marker: 'Pipfile' },
  { name: 'java', marker: 'pom.xml' },
  { name: 'java', marker: 'build.gradle' },
  { name: 'java', marker: 'build.gradle.kts' },
  { name: 'rust', marker: 'Cargo.toml' },
  { name: 'go', marker: 'go.mod' },
  { name: 'go', marker: 'go.sum' },
  { name: 'ruby', marker: 'Gemfile' },
  { name: 'ruby', marker: 'Rakefile' },
  { name: 'php', marker: 'composer.json' },
  { name: 'csharp', marker: '*.csproj' },
  { name: 'csharp', marker: '*.sln' },
];

function detectAiTools(targetDir) {
  const found = AI_TOOLS.filter(t => fileExists(path.join(targetDir, t.marker))).map(t => t.name);
  return found.length > 0 ? found : ['claude-code'];
}

function detectTechStack(targetDir) {
  for (const s of TECH_STACKS) {
    const mp = path.join(targetDir, s.marker);
    
    if (s.marker.includes('*')) {
      const dirContents = fs.existsSync(targetDir) ? fs.readdirSync(targetDir) : [];
      const matches = dirContents.some(f => f.endsWith(s.marker.replace('*.', '.')));
      if (matches) return s.name;
    } else if (fileExists(mp)) {
      if (s.checker) {
        const pkg = readJson(mp);
        if (s.checker(pkg)) return s.name;
      } else {
        return s.name;
      }
    }
  }
  return 'unknown';
}

function detectPackageManager(targetDir) {
  if (fileExists(path.join(targetDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fileExists(path.join(targetDir, 'yarn.lock'))) return 'yarn';
  if (fileExists(path.join(targetDir, 'package-lock.json'))) return 'npm';
  if (fileExists(path.join(targetDir, 'bun.lockb'))) return 'bun';
  if (fileExists(path.join(targetDir, 'package.json'))) return 'npm';
  return null;
}

function detectExistingInstall(targetDir) {
  for (const tool of AI_TOOLS) {
    const sp = path.join(targetDir, tool.marker, 'settings.json');
    if (fileExists(sp)) {
      const s = readJson(sp);
      if (s && s['ai-flow']) {
        return { 
          installed: true, 
          version: s['ai-flow']?.version || 'unknown',
          tool: tool.name,
          installedAt: s['ai-flow']?.installedAt || null,
          lastSynced: s['ai-flow']?.lastSynced || null
        };
      }
    }
  }
  return { installed: false };
}

function detectProjectInfo(targetDir) {
  const pkgJson = readJson(path.join(targetDir, 'package.json'));
  return {
    name: pkgJson?.name || path.basename(targetDir),
    version: pkgJson?.version || 'unknown',
    description: pkgJson?.description || '',
    techStack: detectTechStack(targetDir),
    packageManager: detectPackageManager(targetDir),
    aiTools: detectAiTools(targetDir),
  };
}

module.exports = { 
  detectAiTools, detectTechStack, detectExistingInstall, 
  detectPackageManager, detectProjectInfo 
};
