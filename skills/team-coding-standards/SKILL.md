# AI-Flow 企业 AI 工作流系统 — 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 构建基于 superpowers 的企业 AI 工作流系统，提供 npx 安装器和 YAML 工作流驱动的多 Agent 编排能力

**架构：** npm 包形式分发，CLI 入口检测项目环境后复制 skills/agents/commands/templates 到目标项目的 `.claude/` 目录，通过 workflow-runner skill 执行串行工作流

**技术栈：** Node.js（无外部依赖），YAML（工作流定义），Markdown（Agent/Command/Skill 定义）

---

## 文件结构总览

| 文件 | 职责 |
|------|------|
| `package.json` | npm 包元数据，定义 bin 入口 |
| `bin/ai-flow.js` | CLI 入口，命令路由 |
| `src/detect.js` | 检测 AI 工具和技术栈 |
| `src/installer.js` | 文件复制逻辑 |
| `src/commands/init.js` | `init` 命令实现 |
| `src/commands/run.js` | `run` 命令实现 |
| `src/commands/sync.js` | `--sync` 命令实现 |
| `src/commands/uninstall.js` | `--uninstall` 命令实现 |
| `src/commands/status.js` | `--status` 命令实现 |
| `src/utils.js` | 共享工具函数 |
| `skills/enterprise/*/SKILL.md` | 7 个企业扩展 skill 定义 |
| `agents/*.md` | 6 个 Agent 角色定义 |
| `commands/*.md` | 4 个自定义命令 |
| `workflows/feature-development.yaml` | 默认工作流 YAML |
| `templates/*/` | 团队配置模板（CLAUDE.md, settings.json, rules/） |
| `hooks/session-start` | 项目级 bootstrap hook |
| `test/cli.test.js` | CLI 功能测试 |

---

## P0：搭建仓库框架 + 安装器

### 任务 1：初始化 npm 包 + CLI 入口

**文件：**
- 创建：`package.json`
- 创建：`bin/ai-flow.js`
- 创建：`src/detect.js`
- 创建：`src/utils.js`
- 测试：`test/cli.test.js`

- [ ] **步骤 1：编写基础测试**

```js
// test/cli.test.js
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BIN = path.join(__dirname, '..', 'bin', 'ai-flow.js');

describe('CLI --help', () => {
  it('should print usage', () => {
    const output = execSync(`node ${BIN} --help`).toString();
    expect(output).toContain('Usage');
    expect(output).toContain('init');
    expect(output).toContain('run');
    expect(output).toContain('--sync');
    expect(output).toContain('--uninstall');
    expect(output).toContain('--status');
  });

  it('should print version with --version', () => {
    const output = execSync(`node ${BIN} --version`).toString();
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should show error for unknown command', () => {
    try {
      execSync(`node ${BIN} unknown-cmd`);
      throw new Error('should have failed');
    } catch (e) {
      expect(e.stderr.toString() || e.message).toMatch(/unknown|unrecognized|error/i);
    }
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

```bash
cd /Users/findream/study/ai-workflow && node test/cli.test.js
```
预期：FAIL，报错 "Cannot find module" 或文件不存在

- [ ] **步骤 3：创建 package.json**

```json
{
  "name": "ai-flow",
  "version": "0.1.0",
  "description": "AI-Flow 企业 AI 工作流系统 — 基于 superpowers 的团队 AI 驱动开发工具",
  "bin": {
    "ai-flow": "bin/ai-flow.js"
  },
  "files": [
    "bin/",
    "src/",
    "skills/",
    "agents/",
    "commands/",
    "workflows/",
    "templates/",
    "hooks/"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "license": "MIT"
}
```

- [ ] **步骤 4：创建 CLI 入口**

```js
#!/usr/bin/env node

// bin/ai-flow.js
'use strict';

const path = require('path');
const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

const args = process.argv.slice(2);
const command = args[0];

if (command === '--help' || command === '-h') {
  console.log(`AI-Flow v${pkg.version} — Enterprise AI Workflow System

Usage:
  ai-flow [command] [options]

Commands:
  init              初始化当前项目（默认命令）
  run               触发工作流执行

Options:
  --help, -h        显示帮助信息
  --version         显示版本号
  --tool <name>     指定 AI 工具 (claude-code|opencode|cursor|all)
  --feature <name>  功能名称（用于 run 命令）
  --workflow <path> 工作流 YAML 路径（用于 run 命令，默认自动检测）
  --sync            同步团队最新配置
  --uninstall       卸载 AI-Flow 配置
  --status          查看安装状态
  --verbose         显示详细日志

Examples:
  npx ai-flow
  npx ai-flow init --tool claude-code
  npx ai-flow run --feature "用户登录"
  npx ai-flow --sync
  npx ai-flow --status
  npx ai-flow --uninstall
`);
  process.exit(0);
}

if (command === '--version') {
  console.log(pkg.version);
  process.exit(0);
}

async function main() {
  const cmd = command || 'init';

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
```

- [ ] **步骤 5：创建工具函数**

```js
// src/utils.js
'use strict';

const fs = require('fs');
const path = require('path');

const PKG_ROOT = path.join(__dirname, '..');

function log(msg, verbose = false) {
  if (!verbose) {
    console.log(`[ai-flow] ${msg}`);
  } else {
    console.log(`[ai-flow][verbose] ${msg}`);
  }
}

function resolveToolPath(targetDir, tool) {
  const toolMap = {
    'claude-code': '.claude',
    'opencode': '.opencode',
    'cursor': '.cursor',
    'hermes': '.hermes',
    'trae': '.trae',
  };
  const dirName = toolMap[tool] || '.claude';
  return path.join(targetDir, dirName);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function readJson(filePath) {
  if (!fileExists(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function writeText(filePath, content) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content);
}

function appendText(filePath, content) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(filePath, content);
}

function getPkgRoot() {
  return PKG_ROOT;
}

module.exports = {
  log,
  resolveToolPath,
  copyDir,
  removeDir,
  fileExists,
  readJson,
  writeJson,
  writeText,
  appendText,
  getPkgRoot,
};
```

- [ ] **步骤 6：创建 AI 工具/技术栈检测逻辑**

```js
// src/detect.js
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
  { name: 'typescript', marker: 'package.json', checker: (pkg) => pkg && (pkg.dependencies?.typescript || pkg.devDependencies?.typescript) },
  { name: 'python', marker: 'pyproject.toml' },
  { name: 'python', marker: 'requirements.txt' },
  { name: 'java', marker: 'pom.xml' },
  { name: 'java', marker: 'build.gradle' },
  { name: 'java', marker: 'build.gradle.kts' },
];

function detectAiTools(targetDir) {
  const found = [];
  for (const tool of AI_TOOLS) {
    if (fileExists(path.join(targetDir, tool.marker))) {
      found.push(tool.name);
    }
  }
  return found.length > 0 ? found : ['claude-code']; // default
}

function detectTechStack(targetDir) {
  for (const stack of TECH_STACKS) {
    const markerPath = path.join(targetDir, stack.marker);
    if (fileExists(markerPath)) {
      if (stack.checker && stack.marker === 'package.json') {
        try {
          const pkg = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
          if (stack.checker(pkg)) return stack.name;
        } catch { /* skip */ }
      } else {
        return stack.name;
      }
    }
  }
  return 'unknown';
}

function detectExistingInstall(targetDir) {
  // Check for any ai-flow marker
  const claudeDir = path.join(targetDir, '.claude');
  if (fileExists(claudeDir)) {
    const settingsPath = path.join(claudeDir, 'settings.json');
    if (fileExists(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        if (settings['ai-flow']) {
          return { installed: true, version: settings['ai-flow']?.version || 'unknown' };
        }
      } catch { /* skip */ }
    }
  }
  return { installed: false };
}

module.exports = { detectAiTools, detectTechStack, detectExistingInstall };
```

- [ ] **步骤 7：运行测试验证**

```bash
cd /Users/findream/study/ai-workflow && node test/cli.test.js
```
预期：PASS，所有 CLI 基础测试通过

- [ ] **步骤 8：Commit**

```bash
git add package.json bin/ai-flow.js src/detect.js src/utils.js test/cli.test.js
git commit -m "feat: P0 初始化 npm 包和 CLI 入口

- 添加 package.json 配置
- 添加 bin/ai-flow.js CLI 入口（支持 init/run/--sync/--uninstall/--status）
- 添加 src/detect.js AI 工具/技术栈检测
- 添加 src/utils.js 共享工具函数
- 添加 CLI 基础测试"
```

### 任务 2：init 命令实现

**文件：**
- 创建：`src/commands/init.js`
- 测试：`test/cli.test.js`（扩展）

- [ ] **步骤 1：编写 init 命令测试**

```js
// 添加到 test/cli.test.js
const os = require('os');

describe('CLI init', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-flow-test-'));
    // Create marker for claude-code
    fs.mkdirSync(path.join(tmpDir, '.claude'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should create .claude/skills/ directory', () => {
    execSync(`node ${BIN} init`, { cwd: tmpDir });
    expect(fs.existsSync(path.join(tmpDir, '.claude', 'skills'))).toBe(true);
  });

  it('should create .claude/agents/ directory', () => {
    execSync(`node ${BIN} init`, { cwd: tmpDir });
    expect(fs.existsSync(path.join(tmpDir, '.claude', 'agents'))).toBe(true);
  });

  it('should create .claude/commands/ directory', () => {
    execSync(`node ${BIN} init`, { cwd: tmpDir });
    expect(fs.existsSync(path.join(tmpDir, '.claude', 'commands'))).toBe(true);
  });

  it('should create .claude/workflows/ directory', () => {
    execSync(`node ${BIN} init`, { cwd: tmpDir });
    expect(fs.existsSync(path.join(tmpDir, '.claude', 'workflows'))).toBe(true);
  });

  it('should append to CLAUDE.md', () => {
    execSync(`node ${BIN} init`, { cwd: tmpDir });
    const ClaudeMd = fs.readFileSync(path.join(tmpDir, '.claude', 'CLAUDE.md'), 'utf8');
    expect(ClaudeMd).toContain('AI-Flow');
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

```bash
cd /Users/findream/study/ai-workflow && node test/cli.test.js
```
预期：FAIL，报错 require 找不到模块

- [ ] **步骤 3：实现 init 命令**

```js
// src/commands/init.js
'use strict';

const path = require('path');
const fs = require('fs');
const { detectAiTools, detectTechStack, detectExistingInstall } = require('../detect');
const { log, resolveToolPath, copyDir, writeText, appendText, getPkgRoot, readJson, writeJson, fileExists } = require('../utils');

async function run(args) {
  const targetDir = process.cwd();
  const toolFlag = args.includes('--tool')
    ? args[args.indexOf('--tool') + 1]
    : null;
  const verbose = args.includes('--verbose');

  log('=== AI-Flow Init ===');

  // Detect AI tools
  const aiTools = toolFlag ? [toolFlag] : detectAiTools(targetDir);
  log(`Detected AI tools: ${aiTools.join(', ')}`);

  // Detect tech stack
  const techStack = detectTechStack(targetDir);
  log(`Detected tech stack: ${techStack}`);

  // Check existing install
  const existing = detectExistingInstall(targetDir);
  if (existing.installed) {
    log(`Warning: AI-Flow v${existing.version} already installed in this project.`);
    log('Re-running init will merge configurations.');
  }

  const pkgRoot = getPkgRoot();

  for (const tool of aiTools) {
    const toolDir = resolveToolPath(targetDir, tool);

    // 1. Create base directories
    fs.mkdirSync(path.join(toolDir, 'skills'), { recursive: true });
    fs.mkdirSync(path.join(toolDir, 'agents'), { recursive: true });
    fs.mkdirSync(path.join(toolDir, 'commands'), { recursive: true });
    fs.mkdirSync(path.join(toolDir, 'workflows'), { recursive: true });
    log(`Created directories in ${toolDir}`);

    // 2. Install superpowers core skills
    const superpowersSrc = path.join(pkgRoot, 'node_modules', '@anthropic-ai', 'superpowers', 'skills');
    if (fileExists(superpowersSrc)) {
      copyDir(superpowersSrc, path.join(toolDir, 'skills'));
      log('Installed superpowers core skills');
    } else {
      log('Note: superpowers core skills bundled inline (no node_modules)', verbose);
    }

    // 3. Install enterprise skills
    const enterpriseSkillsSrc = path.join(pkgRoot, 'skills');
    copyDir(enterpriseSkillsSrc, path.join(toolDir, 'skills'));
    log('Installed enterprise skills');

    // 4. Install agent definitions
    const agentsSrc = path.join(pkgRoot, 'agents');
    copyDir(agentsSrc, path.join(toolDir, 'agents'));
    log('Installed agent definitions');

    // 5. Install commands
    const commandsSrc = path.join(pkgRoot, 'commands');
    copyDir(commandsSrc, path.join(toolDir, 'commands'));
    log('Installed custom commands');

    // 6. Install workflow definitions
    const workflowsSrc = path.join(pkgRoot, 'workflows');
    copyDir(workflowsSrc, path.join(toolDir, 'workflows'));
    log('Installed workflow definitions');

    // 7. Install templates
    const templatesSrc = path.join(pkgRoot, 'templates');
    if (fileExists(templatesSrc)) {
      // Copy settings.json if not exists
      const settingsSrc = path.join(templatesSrc, 'settings.json');
      const settingsDest = path.join(toolDir, 'settings.json');
      if (fileExists(settingsSrc) && !fileExists(settingsDest)) {
        const settings = readJson(settingsSrc);
        // Add ai-flow metadata
        const pkg = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'));
        settings['ai-flow'] = { version: pkg.version, installedAt: new Date().toISOString() };
        writeJson(settingsDest, settings);
        log('Created settings.json from template');
      }

      // Copy rules directory
      const rulesSrc = path.join(templatesSrc, 'rules');
      if (fileExists(rulesSrc)) {
        copyDir(rulesSrc, path.join(toolDir, 'rules'));
        log('Installed rule templates');
      }

      // Copy tech preset if matches
      const presetSrc = path.join(templatesSrc, 'presets', techStack);
      if (fileExists(presetSrc)) {
        copyDir(presetSrc, path.join(toolDir, 'rules'));
        log(`Installed ${techStack} preset rules`);
      }
    }

    // 8. Generate bootstrap in CLAUDE.md
    const ClaudeMdPath = path.join(toolDir, 'CLAUDE.md');
    const bootstrapContent = generateBootstrap(aiTools, techStack);
    if (!fileExists(ClaudeMdPath)) {
      writeText(ClaudeMdPath, bootstrapContent);
    } else {
      const existing = fs.readFileSync(ClaudeMdPath, 'utf8');
      if (!existing.includes('# AI-Flow')) {
        appendText(ClaudeMdPath, '\n' + bootstrapContent);
      }
    }
    log('Updated CLAUDE.md bootstrap');

    // 9. Update .gitignore
    updateGitignore(targetDir);
    log('Updated .gitignore');
  }

  log(`AI-Flow initialized successfully for: ${aiTools.join(', ')}`);
}

function generateBootstrap(aiTools, techStack) {
  return `
# AI-Flow Bootstrap (auto-generated, do not edit manually)
# Generated at: ${new Date().toISOString()}

## AI Tools
This project uses: ${aiTools.join(', ')}

## Tech Stack
Primary stack: ${techStack}

## AI-Flow Skills
Enterprise skills are loaded from .claude/skills/.
See CLAUDE.md for skill usage instructions.

## Agent Configuration
Agent definitions are in .claude/agents/.
Use the Plan tool or subagents to dispatch specialized agents.

## Workflow
Default workflow: .claude/workflows/feature-development.yaml
Run: npx ai-flow run --feature "<feature-name>"
`.trim() + '\n';
}

function updateGitignore(targetDir) {
  const gitignorePath = path.join(targetDir, '.gitignore');
  const entries = [
    '# AI-Flow',
    '.claude/settings.local.json',
    '.claude/CLAUDE.local.md',
  ];

  let existing = '';
  if (fileExists(gitignorePath)) {
    existing = fs.readFileSync(gitignorePath, 'utf8');
  }

  const needsUpdate = entries.some(e => !existing.includes(e));
  if (needsUpdate) {
    const newContent = existing + '\n' + entries.join('\n') + '\n';
    fs.writeFileSync(gitignorePath, newContent);
  }
}

module.exports = { run };
```

- [ ] **步骤 4：运行测试验证**

```bash
cd /Users/findream/study/ai-workflow && node test/cli.test.js
```
预期：PASS

- [ ] **步骤 5：Commit**

```bash
git add src/commands/init.js test/cli.test.js
git commit -m "feat: P0 实现 init 命令

- 检测 AI 工具和技术栈
- 复制 skills/agents/commands/workflows 到目标项目
- 生成 CLAUDE.md bootstrap
- 更新 .gitignore
- 添加 init 命令测试"
```

### 任务 3：run 命令实现（YAML 工作流解析）

**文件：**
- 创建：`src/commands/run.js`
- 测试：`test/cli.test.js`（扩展）

- [ ] **步骤 1：编写 run 命令测试**

```js
// 添加到 test/cli.test.js
describe('CLI run', () => {
  it('should error without --feature flag', () => {
    try {
      execSync(`node ${BIN} run`, { cwd: process.cwd() });
      throw new Error('should have failed');
    } catch (e) {
      expect(e.stderr.toString() || e.message).toMatch(/feature|required|--feature/i);
    }
  });

  it('should parse workflow YAML and show stages', () => {
    // Verify the default workflow file is parseable
    const yaml = require('fs').readFileSync(
      path.join(process.cwd(), 'workflows', 'feature-development.yaml'), 'utf8'
    );
    expect(yaml).toContain('name:');
    expect(yaml).toContain('stages:');
    expect(yaml).toContain('agent: architect');
    expect(yaml).toContain('agent: designer');
    expect(yaml).toContain('agent: coder');
    expect(yaml).toContain('agent: tester');
    expect(yaml).toContain('agent: reviewer');
    expect(yaml).toContain('agent: orchestrator');
  });
});
```

- [ ] **步骤 2：实现 run 命令**

```js
// src/commands/run.js
'use strict';

const path = require('path');
const fs = require('fs');
const { log, fileExists } = require('../utils');

function parseYamlSimple(content) {
  // Minimal YAML parser for workflow files (no external deps for P0)
  // This handles the specific structure of our workflow files
  const result = { name: '', version: '', trigger: {}, stages: [] };
  const lines = content.split('\n');
  let currentStage = null;
  let inStage = false;
  let inTrigger = false;
  let inHumanGate = false;
  let inOnFailure = false;
  let inSkills = false;
  let inActions = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Top-level name
    if (line.startsWith('name:')) {
      result.name = line.slice(5).trim().replace(/^["']|["']$/g, '');
      continue;
    }
    if (line.startsWith('version:')) {
      result.version = line.slice(8).trim().replace(/^["']|["']$/g, '');
      continue;
    }

    // Trigger section
    if (line.startsWith('trigger:')) {
      inTrigger = true;
      inStage = false;
      continue;
    }
    if (inTrigger && line.startsWith('  ')) {
      const [key, ...valParts] = trimmed.split(':');
      if (key && valParts.length > 0) {
        result.trigger[key.trim()] = valParts.join(':').trim().replace(/^["']|["']$/g, '');
      }
      continue;
    }

    // Stages section
    if (trimmed.startsWith('- name:')) {
      if (currentStage) result.stages.push(currentStage);
      currentStage = {
        name: trimmed.slice(7).trim(),
        agent: '',
        model: 'sonnet',
        skills: [],
        input: '',
        output: '',
        auto_continue: false,
        human_gate: null,
        on_failure: null,
      };
      inStage = true;
      inTrigger = false;
      inHumanGate = false;
      inOnFailure = false;
      inSkills = false;
      inActions = false;
      continue;
    }

    if (inStage && currentStage) {
      if (trimmed.startsWith('- name:') || !line.startsWith(' ')) {
        // Not in a stage anymore
        continue;
      }

      if (trimmed === 'skills: []') {
        currentStage.skills = [];
        inSkills = false;
        continue;
      }

      if (inSkills) {
        if (trimmed.startsWith('- ')) {
          currentStage.skills.push(trimmed.slice(2).trim());
        } else {
          inSkills = false;
        }
      }

      if (inActions) {
        if (trimmed.startsWith('- ')) {
          (currentStage.human_gate.actions).push(trimmed.slice(2).trim());
        } else {
          inActions = false;
        }
      }

      if (trimmed.startsWith('agent:')) {
        currentStage.agent = trimmed.slice(6).trim();
      } else if (trimmed.startsWith('model:')) {
        currentStage.model = trimmed.slice(6).trim();
      } else if (trimmed.startsWith('input:')) {
        currentStage.input = trimmed.slice(6).trim();
      } else if (trimmed.startsWith('output:')) {
        currentStage.output = trimmed.slice(7).trim();
      } else if (trimmed.startsWith('auto_continue: true')) {
        currentStage.auto_continue = true;
      } else if (trimmed.startsWith('skills: [')) {
        const skillsStr = trimmed.match(/\[(.+)\]/);
        if (skillsStr) {
          currentStage.skills = skillsStr[1].split(',').map(s => s.trim().replace(/["']/g, ''));
        }
      } else if (trimmed.startsWith('skills:')) {
        inSkills = true;
      } else if (trimmed.startsWith('human_gate:')) {
        currentStage.human_gate = { title: '', notify: '', actions: [] };
        inHumanGate = true;
        inOnFailure = false;
      } else if (trimmed.startsWith('on_failure:')) {
        currentStage.on_failure = { route_to: '', max_retries: 3 };
        inOnFailure = true;
        inHumanGate = false;
      } else if (inHumanGate && trimmed.startsWith('title:')) {
        currentStage.human_gate.title = trimmed.slice(6).trim().replace(/"/g, '');
      } else if (inHumanGate && trimmed.startsWith('notify:')) {
        currentStage.human_gate.notify = trimmed.slice(7).trim();
      } else if (inHumanGate && trimmed.startsWith('actions:')) {
        const actionsStr = trimmed.match(/\[(.+)\]/);
        if (actionsStr) {
          currentStage.human_gate.actions = actionsStr[1].split(',').map(s => s.trim().replace(/["']/g, ''));
        } else {
          inActions = true;
        }
      } else if (inOnFailure && trimmed.startsWith('route_to:')) {
        currentStage.on_failure.route_to = trimmed.slice(9).trim();
      } else if (inOnFailure && trimmed.startsWith('max_retries:')) {
        currentStage.on_failure.max_retries = parseInt(trimmed.slice(12).trim(), 10);
      }
    }
  }

  if (currentStage) result.stages.push(currentStage);
  return result;
}

function loadWorkflow(targetDir) {
  // Check project-level workflow first, then package default
  const candidates = [
    path.join(targetDir, '.claude', 'workflows', 'feature-development.yaml'),
    path.join(targetDir, '.opencode', 'workflows', 'feature-development.yaml'),
    path.join(__dirname, '..', '..', 'workflows', 'feature-development.yaml'),
  ];

  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      const content = fs.readFileSync(candidate, 'utf8');
      return { ...parseYamlSimple(content), path: candidate };
    }
  }
  return null;
}

async function run(args) {
  const featureIndex = args.indexOf('--feature');
  const workflowIndex = args.indexOf('--workflow');

  if (featureIndex === -1) {
    console.error('Error: --feature flag is required. Usage: ai-flow run --feature "<feature-name>"');
    process.exit(1);
  }

  const featureName = args[featureIndex + 1];
  const targetDir = process.cwd();

  log(`=== AI-Flow Run ===`);
  log(`Feature: ${featureName}`);

  const workflow = loadWorkflow(targetDir);
  if (!workflow) {
    console.error('Error: No workflow found. Run "ai-flow init" first.');
    process.exit(1);
  }

  log(`Workflow: ${workflow.name} (v${workflow.version})`);
  log(`Stages: ${workflow.stages.length}`);

  // Print workflow overview
  for (const stage of workflow.stages) {
    const gate = stage.human_gate ? '🔴' : '⚡';
    log(`  ${gate} ${stage.name} [${stage.agent}]`);
  }

  log(`\nDispatching to workflow-runner...`);
  log(`Feature name: ${featureName}`);
  log(`Workflow path: ${workflow.path}`);

  // In P0, we output the workflow plan for the human/Claude to execute
  // In P3+, this will be handled by the orchestration engine
  console.log(`
Workflow dispatched. Next steps:
1. Stage 1: ${workflow.stages[0]?.name || 'N/A'}
   Agent: ${workflow.stages[0]?.agent || 'N/A'}

To execute manually, use:
  npx ai-flow run --feature "${featureName}" --verbose

For automated execution, see team-agent-orchestrator skill (P3+).
`);
}

module.exports = { run, parseYamlSimple, loadWorkflow };
```

- [ ] **步骤 3：运行测试验证**

```bash
cd /Users/findream/study/ai-workflow && node test/cli.test.js
```
预期：PASS

- [ ] **步骤 4：Commit**

```bash
git add src/commands/run.js test/cli.test.js
git commit -m "feat: P0 实现 run 命令 + YAML 工作流解析

- 实现最小 YAML 解析器（适配工作流结构）
- 支持 --feature 和 --workflow 参数
- 加载项目级或包级工作流定义
- 输出工作流概览和阶段信息"
```

### 任务 4：sync / uninstall / status 命令

**文件：**
- 创建：`src/commands/sync.js`
- 创建：`src/commands/uninstall.js`
- 创建：`src/commands/status.js`
- 测试：`test/cli.test.js`（扩展）

- [ ] **步骤 1：实现 sync 命令**

```js
// src/commands/sync.js
'use strict';

const path = require('path');
const fs = require('fs');
const { detectAiTools } = require('../detect');
const { log, resolveToolPath, copyDir, getPkgRoot, fileExists, readJson, writeJson } = require('../utils');

async function run() {
  const targetDir = process.cwd();
  const pkgRoot = getPkgRoot();

  log('=== AI-Flow Sync ===');

  const aiTools = detectAiTools(targetDir);

  for (const tool of aiTools) {
    const toolDir = resolveToolPath(targetDir, tool);

    // Sync enterprise skills
    const enterpriseSkillsSrc = path.join(pkgRoot, 'skills');
    if (fileExists(enterpriseSkillsSrc)) {
      copyDir(enterpriseSkillsSrc, path.join(toolDir, 'skills'));
      log(`Synced enterprise skills → ${tool}`);
    }

    // Sync agent definitions
    const agentsSrc = path.join(pkgRoot, 'agents');
    if (fileExists(agentsSrc)) {
      copyDir(agentsSrc, path.join(toolDir, 'agents'));
      log(`Synced agent definitions → ${tool}`);
    }

    // Sync commands
    const commandsSrc = path.join(pkgRoot, 'commands');
    if (fileExists(commandsSrc)) {
      copyDir(commandsSrc, path.join(toolDir, 'commands'));
      log(`Synced commands → ${tool}`);
    }

    // Sync workflows
    const workflowsSrc = path.join(pkgRoot, 'workflows');
    if (fileExists(workflowsSrc)) {
      copyDir(workflowsSrc, path.join(toolDir, 'workflows'));
      log(`Synced workflows → ${tool}`);
    }

    // Update version metadata
    const settingsPath = path.join(toolDir, 'settings.json');
    if (fileExists(settingsPath)) {
      const settings = readJson(settingsPath);
      const pkg = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'));
      if (settings['ai-flow']) {
        settings['ai-flow'].version = pkg.version;
        settings['ai-flow'].lastSynced = new Date().toISOString();
        writeJson(settingsPath, settings);
      }
    }
  }

  log(`Sync complete for: ${aiTools.join(', ')}`);
}

module.exports = { run };
```

- [ ] **步骤 2：实现 uninstall 命令**

```js
// src/commands/uninstall.js
'use strict';

const path = require('path');
const fs = require('fs');
const { detectAiTools } = require('../detect');
const { log, resolveToolPath, fileExists, readJson, writeJson } = require('../utils');

async function run() {
  const targetDir = process.cwd();
  const aiTools = detectAiTools(targetDir);

  log('=== AI-Flow Uninstall ===');

  for (const tool of aiTools) {
    const toolDir = resolveToolPath(targetDir, tool);

    // Remove ai-flow managed directories
    const dirsToRemove = ['skills', 'agents', 'commands', 'workflows', 'rules'];
    for (const dir of dirsToRemove) {
      const dirPath = path.join(toolDir, dir);
      if (fileExists(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        log(`Removed ${dir} → ${tool}`);
      }
    }

    // Clean ai-flow metadata from settings.json
    const settingsPath = path.join(toolDir, 'settings.json');
    if (fileExists(settingsPath)) {
      const settings = readJson(settingsPath);
      if (settings && settings['ai-flow']) {
        delete settings['ai-flow'];
        writeJson(settingsPath, settings);
        log(`Cleaned ai-flow metadata from settings.json → ${tool}`);
      }
    }

    // Remove ai-flow bootstrap from CLAUDE.md
    const ClaudeMdPath = path.join(toolDir, 'CLAUDE.md');
    if (fileExists(ClaudeMdPath)) {
      let content = fs.readFileSync(ClaudeMdPath, 'utf8');
      const aiFlowMarker = '# AI-Flow Bootstrap';
      const markerIndex = content.indexOf(aiFlowMarker);
      if (markerIndex !== -1) {
        content = content.slice(0, markerIndex).trimEnd();
        if (content.length > 0) {
          fs.writeFileSync(ClaudeMdPath, content + '\n');
        } else {
          fs.unlinkSync(ClaudeMdPath);
        }
        log(`Removed ai-flow bootstrap from CLAUDE.md → ${tool}`);
      }
    }
  }

  log('AI-Flow uninstalled successfully.');
}

module.exports = { run };
```

- [ ] **步骤 3：实现 status 命令**

```js
// src/commands/status.js
'use strict';

const path = require('path');
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
    const toolDir = resolveToolPath(targetDir, tool);
    const installInfo = detectExistingInstall(targetDir);

    console.log(`\n${tool}:`);
    console.log(`  Path: ${toolDir}`);
    console.log(`  Installed: ${installInfo.installed ? 'yes (v' + installInfo.version + ')' : 'no'}`);

    const subdirs = ['skills', 'agents', 'commands', 'workflows', 'rules'];
    for (const dir of subdirs) {
      const dirPath = path.join(toolDir, dir);
      if (fileExists(dirPath)) {
        const items = require('fs').readdirSync(dirPath);
        console.log(`  ${dir}: ${items.length} items`);
      } else {
        console.log(`  ${dir}: (not found)`);
      }
    }
  }

  console.log('');
}

module.exports = { run };
```

- [ ] **步骤 4：Commit**

```bash
git add src/commands/sync.js src/commands/uninstall.js src/commands/status.js
git commit -m "feat: P0 实现 sync / uninstall / status 命令

- sync: 同步 enterprise skills/agents/commands/workflows
- uninstall: 清理 ai-flow 管理的目录和元数据
- status: 显示安装状态和各目录内容概览"
```

### 任务 5：创建默认工作流 YAML 文件

**文件：**
- 创建：`workflows/feature-development.yaml`
- 测试：`test/cli.test.js`（验证 YAML 可解析）

- [ ] **步骤 1：创建工作流 YAML**

```yaml
# workflows/feature-development.yaml
name: 功能开发工作流
version: "1.0"
trigger:
  feishu: "/aiflow 实现 <feature>"
  cli: "npx ai-flow run --feature \"<feature>\""

stages:
  - name: 需求分析
    agent: architect
    model: sonnet
    skills: [brainstorming]
    input: 飞书需求文档 / CLI 输入
    output: 结构化需求文档（User Story + 验收标准）
    human_gate:
      title: "需求确认"
      notify: feishu
      actions: [approve, reject, modify]

  - name: 架构设计
    agent: designer
    model: sonnet
    skills: [writing-plans, subagent-driven-development]
    input: 结构化需求文档
    output: 架构设计文档 + 接口定义 + 任务拆解
    human_gate:
      title: "方案审批"
      notify: feishu
      actions: [approve, reject, modify]

  - name: 编码实现
    agent: coder
    model: sonnet
    skills: [test-driven-development, executing-plans, subagent-driven-development]
    input: 任务列表
    output: 代码 + 单元测试 + Git 提交
    auto_continue: true

  - name: E2E 测试
    agent: tester
    model: sonnet
    skills: [test-driven-development, e2e-runner]
    input: 功能代码 + 需求文档
    output: Playwright 测试 + 测试报告
    on_failure:
      route_to: coder
      max_retries: 3

  - name: 代码审查
    agent: reviewer
    model: sonnet
    skills: [requesting-code-review, receiving-code-review]
    input: git diff + 架构设计文档
    output: 四维审查报告
    human_gate:
      title: "审查通过"
      notify: feishu
      actions: [approve, reject]

  - name: 合并部署
    agent: orchestrator
    model: haiku
    skills: [finishing-a-development-branch, using-git-worktrees]
    output: MR 合并 + DevOps 部署触发
    human_gate:
      title: "部署确认"
      notify: feishu
      actions: [approve, reject]
```

- [ ] **步骤 2：Commit**

```bash
git add workflows/feature-development.yaml
git commit -m "feat: P0 添加默认工作流 YAML 定义

- 6 个阶段：需求分析→架构设计→编码→E2E测试→审查→部署
- 4 个人工卡点
- 失败回退机制（Tester→Coder，最多3次重试）"
```

---

## P1：开发 3 个核心企业 Skills

### 任务 6：team-coding-standards skill

**文件：**
- 创建：`skills/team-coding-standards/SKILL.md`

- [ ] **步骤 1：创建 skill 定义**

```markdown
# skills/team-coding-standards/SKILL.md

# 团队编码规范

## 概述
统一团队编码标准，确保 AI 生成的代码符合团队规范。在编码前加载此 skill。

## 触发条件
- 编写新代码前
- 修改现有代码前
- /implement-feature 命令触发时

## 编码规范

### TypeScript / JavaScript

```
- 使用 TypeScript strict mode
- 所有函数必须有类型注解（参数和返回值）
- 使用 const/let，禁止 var
- 使用箭头函数替代匿名函数表达式
- 使用模板字符串替代字符串拼接
- 文件命名：camelCase.ts，组件文件 PascalCase.tsx
- 导出：优先使用 named export，避免 default export
- 错误处理：使用 Result<T, E> 模式或 try-catch，不静默吞异常
- 异步：优先 async/await，避免 raw Promise chain
```

### Python

```
- 使用 Python 3.10+ type hints
- 遵循 PEP 8 + Black 格式化
- 使用 dataclass 替代裸字典
- 错误处理：使用自定义 Exception 子类
- 文件命名：snake_case.py
- 使用 pathlib 替代 os.path
```

### Java

```
- 使用 Java 17+ 特性（record, pattern matching）
- 遵循 Google Java Style
- 使用 Lombok 减少样板代码
- 依赖注入优先使用构造器注入
- 使用 Optional 替代 null 检查
- 文件命名：PascalCase.java（与类名一致）
```

## 命名规范

| 类型 | 约定 | 示例 |
|------|------|------|
| 类/接口 | PascalCase | `UserService`, `IRepository` |
| 函数/方法 | camelCase | `getUserById()` |
| 变量 | camelCase | `userName`, `isAuthenticated` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 文件 | 按语言约定 | `user-service.ts` / `UserService.java` |

## 文件组织

```
src/
├── features/          # 按业务功能组织
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.model.ts
│   │   └── auth.test.ts
│   └── user/
├── shared/            # 共享工具
│   ├── utils/
│   └── types/
└── config/
```

## Git 提交规范

遵循 Conventional Commits：

```
<type>(<scope>): <description>

types: feat, fix, refactor, docs, test, chore, perf, ci
```
