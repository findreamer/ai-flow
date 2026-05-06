'use strict';
const fs = require('fs');
const path = require('path');
const { fileExists } = require('./utils');

const AI_TOOLS = [
  { name: 'claude-code', marker: '.claude' },
  { name: 'opencode', marker: '.opencode' },
  { name: 'cursor', marker: '.cursor' },
  { name: 'hermes', marker: '.hermes' },
  { name: 'trae', marker: '.trae' },
];

const TECH_STACKS = [
  { name: 'typescript', marker: 'package.json', checker: (p) => p && (p.dependencies?.typescript || p.devDependencies?.typescript) },
  { name: 'python', marker: 'pyproject.toml' },
  { name: 'python', marker: 'requirements.txt' },
  { name: 'java', marker: 'pom.xml' },
  { name: 'java', marker: 'build.gradle' },
  { name: 'java', marker: 'build.gradle.kts' },
];

function detectAiTools(targetDir) {
  const found = AI_TOOLS.filter(t => fileExists(path.join(targetDir, t.marker))).map(t => t.name);
  return found.length > 0 ? found : ['claude-code'];
}

function detectTechStack(targetDir) {
  for (const s of TECH_STACKS) {
    const mp = path.join(targetDir, s.marker);
    if (fileExists(mp)) {
      if (s.checker) {
        try { if (s.checker(JSON.parse(fs.readFileSync(mp, 'utf8')))) return s.name; } catch {}
      } else return s.name;
    }
  }
  return 'unknown';
}

function detectExistingInstall(targetDir) {
  const sp = path.join(targetDir, '.claude', 'settings.json');
  if (fileExists(sp)) {
    try {
      const s = JSON.parse(fs.readFileSync(sp, 'utf8'));
      if (s['ai-flow']) return { installed: true, version: s['ai-flow']?.version || 'unknown' };
    } catch {}
  }
  return { installed: false };
}

module.exports = { detectAiTools, detectTechStack, detectExistingInstall };
