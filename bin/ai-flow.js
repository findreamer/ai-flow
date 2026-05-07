#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const args = process.argv.slice(2);

const KNOWN_FLAGS = [
  '--help', '-h', '--version', '--verbose', '--force', '--clean',
  '--tool', '--feature', '--workflow', '--list', '--json'
];
const command = args[0];
const isFlag = command && command.startsWith('--');
const isKnownCommand = ['init', 'run'].includes(command);
const featureName = command && !isFlag && !isKnownCommand ? command : null;

if (args[0] === '--help' || args[0] === '-h') {
  console.log(`AI-Flow v${pkg.version} — Enterprise AI Workflow System

Usage:
  aiflow "<feature-name>"          Start feature development workflow
  aiflow init                     Initialize current project
  aiflow run --feature "<name>"   Alternative to above (compatible)

Commands:
  init              Initialize project
  run               Run workflow

Options:
  --help, -h        Show help
  --version         Show version
  --tool <name>     Specify AI tool (claude-code|opencode|cursor|trae|hermes|aider)
  --sync            Sync team configurations
  --uninstall       Uninstall AI-Flow (use --force to confirm)
  --status          Check installation status
  --verbose         Show verbose output
  --force           Force operation (init, uninstall)
  --clean           Clean before sync
  --workflow <name> Use specific workflow
  --list            List available workflows
  --json            Output status as JSON

Examples:
  aiflow "User Login"
  npx aiflow "User Login"
  npx aiflow init
  npx aiflow init --tool claude-code
  npx aiflow --sync
  npx aiflow --sync --clean
  npx aiflow --status
  npx aiflow --status --verbose
  npx aiflow --list
  npx aiflow --uninstall --force
`);
  process.exit(0);
}

if (args[0] === '--version') {
  console.log(pkg.version);
  process.exit(0);
}

async function main() {
  if (args.includes('--sync')) {
    await require('../src/commands/sync').run(args);
    return;
  }
  
  if (args.includes('--uninstall')) {
    await require('../src/commands/uninstall').run(args);
    return;
  }
  
  if (args.includes('--status')) {
    await require('../src/commands/status').run(args);
    return;
  }
  
  if (args.includes('--list')) {
    await require('../src/commands/run').run(args);
    return;
  }

  if (featureName) {
    const remainingArgs = args.filter(a => a !== featureName);
    await require('../src/commands/run').run(['--feature', featureName, ...remainingArgs]);
    return;
  }

  const cmd = args[0] || 'init';
  switch (cmd) {
    case 'init':
      await require('../src/commands/init').run(args);
      break;
    case 'run':
      await require('../src/commands/run').run(args);
      break;
    default:
      console.error(`Error: Unknown command "${cmd}". Run "ai-flow --help" for usage.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
