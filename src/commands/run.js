'use strict';
const path = require('path');
const fs = require('fs');
const { parseYaml, validateWorkflow } = require('../parse-yaml');
const { log, setVerbose, fileExists, getDirContents, resolveToolPath } = require('../utils');
const { detectAiTools } = require('../detect');

function loadWorkflow(targetDir, workflowName = 'feature-development') {
  const aiTools = detectAiTools(targetDir);
  
  let candidates = [];
  
  for (const tool of aiTools) {
    const toolDir = resolveToolPath(targetDir, tool);
    candidates.push(path.join(toolDir, 'workflows', `${workflowName}.yaml`));
    candidates.push(path.join(toolDir, 'workflows', `${workflowName}.yml`));
  }
  
  candidates.push(path.join(__dirname, '..', '..', 'workflows', `${workflowName}.yaml`));
  candidates.push(path.join(__dirname, '..', '..', 'workflows', `${workflowName}.yml`));
  
  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      const content = fs.readFileSync(candidate, 'utf8');
      return { ...parseYaml(content), path: candidate };
    }
  }
  
  return null;
}

function listWorkflows(targetDir) {
  const aiTools = detectAiTools(targetDir);
  const workflows = [];
  
  for (const tool of aiTools) {
    const toolDir = resolveToolPath(targetDir, tool);
    const workflowsDir = path.join(toolDir, 'workflows');
    
    if (fileExists(workflowsDir)) {
      const items = getDirContents(workflowsDir);
      for (const item of items) {
        if (item.name.endsWith('.yaml') || item.name.endsWith('.yml')) {
          const wfName = item.name.replace(/\.ya?ml$/, '');
          if (!workflows.find(w => w.name === wfName)) {
            workflows.push({ name: wfName, path: path.join(workflowsDir, item.name) });
          }
        }
      }
    }
  }
  
  const defaultWfDir = path.join(__dirname, '..', '..', 'workflows');
  if (fileExists(defaultWfDir)) {
    const items = getDirContents(defaultWfDir);
    for (const item of items) {
      if (item.name.endsWith('.yaml') || item.name.endsWith('.yml')) {
        const wfName = item.name.replace(/\.ya?ml$/, '');
        if (!workflows.find(w => w.name === wfName)) {
          workflows.push({ name: wfName, path: path.join(defaultWfDir, item.name) });
        }
      }
    }
  }
  
  return workflows;
}

async function run(args) {
  const verbose = args.includes('--verbose');
  setVerbose(verbose);
  
  let featureName = null;
  let workflowName = 'feature-development';
  let list = args.includes('--list');
  
  const targetDir = process.cwd();
  
  if (list) {
    log('=== Available Workflows ===');
    const workflows = listWorkflows(targetDir);
    
    if (workflows.length === 0) {
      log('No workflows found. Run "npx aiflow init" to set up.');
      return;
    }
    
    for (const wf of workflows) {
      log(`  - ${wf.name}`);
      log(`    ${wf.path}`);
    }
    return;
  }
  
  const featureIdx = args.indexOf('--feature');
  const workflowIdx = args.indexOf('--workflow');
  
  if (workflowIdx !== -1) {
    workflowName = args[workflowIdx + 1];
  }
  
  if (featureIdx !== -1) {
    featureName = args[featureIdx + 1];
  } else if (args.length > 0 && !args[0].startsWith('--')) {
    const positionalArgs = args.filter(a => !a.startsWith('--'));
    if (positionalArgs.length > 0) {
      featureName = positionalArgs.join(' ');
    }
  }
  
  if (!featureName) {
    console.error('Error: Feature name is required.');
    console.error('Usage: npx aiflow "<feature-name>"');
    console.error('       npx aiflow run --feature "<feature-name>"');
    console.error('       npx aiflow --list                 - List workflows');
    console.error('       npx aiflow --workflow <name> ... - Use specific workflow');
    process.exit(1);
  }

  log('=== AI-Flow Run ===');
  log(`Feature: ${featureName}`);

  const wf = loadWorkflow(targetDir, workflowName);
  
  if (!wf) {
    console.error(`Error: Workflow "${workflowName}" not found.`);
    console.error('Run "npx aiflow init" first, or "npx aiflow --list" to see available workflows.');
    process.exit(1);
  }

  const validation = validateWorkflow(wf);
  if (!validation.valid) {
    console.error('Error: Invalid workflow configuration:');
    validation.errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }

  log(`Workflow: ${wf.name} (v${wf.version})`);
  if (wf.description) {
    log(`${wf.description.split('\n').map(l => '  ' + l).join('\n')}`);
  }
  
  log(`Stages: ${wf.stages.length}`);
  for (const s of wf.stages) {
    const gate = s.human_gate ? '🔴' : '⚡';
    const skills = s.skills && s.skills.length > 0 ? ` [skills: ${s.skills.join(', ')}]` : '';
    log(`  ${gate} ${s.name} [${s.agent}]${skills}`);
    
    if (verbose && s.human_gate) {
      if (s.human_gate.title) log(`       Gate: ${s.human_gate.title}`);
      if (s.human_gate.notify) log(`       Notify: ${s.human_gate.notify}`);
      if (s.human_gate.actions) log(`       Actions: ${s.human_gate.actions.join(', ')}`);
    }
  }
  
  log(`\nWorkflow path: ${wf.path}`);
  log('');
  log('Next steps:');
  log('  1. Check the first stage requirements');
  log('  2. Dispatch to the appropriate agent');
  log('  3. Approve at human gate stages if needed');
  log('');
  log('Tip: Use the workflow-runner skill to execute the workflow automatically.');
}

module.exports = { run, loadWorkflow, listWorkflows };
