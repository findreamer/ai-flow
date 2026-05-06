#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const args = process.argv.slice(2);

const KNOWN_COMMANDS = ['init', 'run', '--sync', '--uninstall', '--status', '--help', '-h', '--version', '--tool'];
const command = args[0];
const featureName = command && !command.startsWith('--') && !KNOWN_COMMANDS.includes(command) ? command : null;

if (args[0] === '--help' || args[0] === '-h') {
  console.log(`AI-Flow v${pkg.version} — Enterprise AI Workflow System

Usage:
  aiflow "<feature-name>"          启动功能开发工作流
  ai-flow init                     初始化当前项目
  ai-flow run --feature "<name>"   同上（兼容写法）

Options:
  --help, -h        显示帮助信息
  --version         显示版本号
  --tool <name>     指定 AI 工具 (claude-code|opencode|cursor|all)
  --sync            同步团队最新配置
  --uninstall       卸载 AI-Flow 配置
  --status          查看安装状态
  --verbose         显示详细日志

Examples:
  aiflow "用户登录"
  npx aiflow "用户登录"
  npx ai-flow init
  npx ai-flow init --tool claude-code
  npx ai-flow --sync
  npx ai-flow --status
  npx ai-flow --uninstall
`);
  process.exit(0);
}

if (args[0] === '--version') {
  console.log(pkg.version);
  process.exit(0);
}

async function main() {
  if (featureName && !args.includes('--feature')) {
    await require('../src/commands/run').run(['--feature', featureName]);
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
    case '--sync':
      await require('../src/commands/sync').run();
      break;
    case '--uninstall':
      await require('../src/commands/uninstall').run();
      break;
    case '--status':
      await require('../src/commands/status').run();
      break;
    default:
      console.error(`Error: Unknown command "${cmd}". Run "ai-flow --help" for usage.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
