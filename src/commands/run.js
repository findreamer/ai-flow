'use strict';
const path = require('path');
const fs = require('fs');
const { parseYaml } = require('../parse-yaml');
const { log, fileExists } = require('../utils');

function loadWorkflow(targetDir) {
  const candidates = [
    path.join(targetDir, '.claude', 'workflows', 'feature-development.yaml'),
    path.join(targetDir, '.opencode', 'workflows', 'feature-development.yaml'),
    path.join(__dirname, '..', '..', 'workflows', 'feature-development.yaml'),
  ];
  for (const c of candidates) {
    if (fileExists(c)) {
      const content = fs.readFileSync(c, 'utf8');
      return { ...parseYaml(content), path: c };
    }
  }
  return null;
}

async function run(args) {
  const fi = args.indexOf('--feature');
  if (fi === -1) {
    console.error('Error: --feature flag is required. Usage: aiflow "<feature-name>"');
    process.exit(1);
  }
  const featureName = args[fi + 1];
  const targetDir = process.cwd();

  log('=== AI-Flow Run ===');
  log(`Feature: ${featureName}`);

  const wf = loadWorkflow(targetDir);
  if (!wf) {
    console.error('Error: No workflow found. Run "ai-flow init" first.');
    process.exit(1);
  }

  log(`Workflow: ${wf.name} (v${wf.version})`);
  log(`Stages: ${wf.stages.length}`);
  for (const s of wf.stages) {
    const gate = s.human_gate ? '🔴' : '⚡';
    log(`  ${gate} ${s.name} [${s.agent}]`);
  }
  log(`\nDispatching to workflow-runner...`);
  log(`Workflow path: ${wf.path}`);
}

module.exports = { run, loadWorkflow };
