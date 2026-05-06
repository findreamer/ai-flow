# AI-Flow 企业 AI 工作流系统 — 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 构建基于 superpowers 的企业 AI 工作流系统，提供 npx 安装器和 YAML 工作流驱动的多 Agent 编排能力

**架构：** npm 包形式分发，CLI 入口检测项目环境后复制 skills/agents/commands/templates 到目标项目的 `.claude/` 目录，通过 workflow-runner skill 执行串行工作流

**技术栈：** Node.js（无外部依赖），YAML（工作流定义），Markdown（Agent/Command/Skill 定义）

---

## 设计变更记录

| 变更 | 原设计 | 新设计 | 原因 |
|------|--------|--------|------|
| 触发命令 | `npx ai-flow run --feature "xxx"` | `npx aiflow "xxx"` | 三个端统一命令 |
| 飞书集成 | 自行实现 Webhook | 基于 `lark-cli` | 飞书 CLI 已覆盖 200+ 命令 |
| GitLab MR | curl 调用 API | `glab` CLI | 自建 GitLab 兼容性更好 |
| AI 代码分支 | `develop` | `develop-ai-flow` | 隔离 AI 生成代码，不影响存量项目 |
| 输出目录 | 扁平 `.ai-flow/output/` | `.ai-flow/output/iterations/YYYYMMDD-N-name/` | 多迭代可追溯 |
| 模板管理 | 内嵌在 Agent 定义中 | 引用 `templates/references/` 外部文件 | 方便独立优化模板 |

---

## 文件结构总览

| 文件 | 职责 |
|------|------|
| `package.json` | npm 包元数据，定义 bin 入口 |
| `bin/ai-flow.js` | CLI 入口，命令路由 |
| `src/detect.js` | 检测 AI 工具和技术栈 |
| `src/installer.js` | 文件复制逻辑 |
| `src/commands/init.js` | `init` 命令实现 |
| `src/commands/run.js` | `run` 命令实现（即 `aiflow` 的底层实现） |
| `src/commands/sync.js` | `--sync` 命令实现 |
| `src/commands/uninstall.js` | `--uninstall` 命令实现 |
| `src/commands/status.js` | `--status` 命令实现 |
| `src/utils.js` | 共享工具函数 |
| `src/parse-yaml.js` | 最小 YAML 解析器 |
| `skills/enterprise/*/SKILL.md` | 7 个企业扩展 skill 定义 |
| `agents/*.md` | 6 个 Agent 角色定义 |
| `commands/aiflow.md` | aiflow slash command |
| `workflows/feature-development.yaml` | 默认工作流 YAML |
| `templates/CLAUDE.md` | CLAUDE.md 模板 |
| `templates/settings.json` | settings.json 模板 |
| `templates/rules/` | 规则模板 |
| `templates/references/*.md` | 文档输出格式模板（外部引用） |
| `hooks/session-start` | 项目级 bootstrap hook |
| `test/cli.test.js` | CLI 功能测试 |

---

## P0：搭建仓库框架 + 安装器

### 任务 1：初始化 npm 包 + CLI 入口

**文件：**
- 创建：`package.json`
- 创建：`bin/ai-flow.js`
- 创建：`src/utils.js`

- [ ] **步骤 1：创建 package.json**

```json
{
  "name": "ai-flow",
  "version": "0.1.0",
  "description": "AI-Flow 企业 AI 工作流系统 — 基于 superpowers 的团队 AI 驱动开发工具",
  "bin": {
    "ai-flow": "bin/ai-flow.js",
    "aiflow": "bin/ai-flow.js"
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

- [ ] **步骤 2：创建 CLI 入口**

```js
#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const args = process.argv.slice(2);

// Handle both 'ai-flow' and 'aiflow' as entry points
const command = args[0];
const featureName = command && !command.startsWith('--') ? command : null;

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
  // Shortcut: "aiflow <feature-name>" → run workflow directly
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
```

- [ ] **步骤 3：创建 src/utils.js（共享工具函数）**

```js
// src/utils.js
'use strict';
const fs = require('fs');
const path = require('path');
const PKG_ROOT = path.join(__dirname, '..');

function log(msg, verbose = false) {
  if (!verbose) console.log(`[ai-flow] ${msg}`);
  else console.log(`[ai-flow][verbose] ${msg}`);
}

function resolveToolPath(targetDir, tool) {
  const toolMap = {
    'claude-code': '.claude',
    'opencode': '.opencode',
    'cursor': '.cursor',
    'hermes': '.hermes',
    'trae': '.trae',
  };
  return path.join(targetDir, toolMap[tool] || '.claude');
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(srcPath, destPath) : fs.copyFileSync(srcPath, destPath);
  }
}

function fileExists(filePath) { return fs.existsSync(filePath); }
function readJson(filePath) { return fileExists(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : null; }
function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}
function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
function appendText(filePath, content) {
  const dir = path.dirname(filePath);
  if (dir) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(filePath, content);
}
function getPkgRoot() { return PKG_ROOT; }

module.exports = { log, resolveToolPath, copyDir, fileExists, readJson, writeJson, writeText, appendText, getPkgRoot };
```

- [ ] **步骤 4：创建 src/detect.js**

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
```

- [ ] **步骤 5：编写基础测试**

```js
// test/cli.test.js
const { execSync } = require('child_process');
const path = require('path');
const BIN = path.join(__dirname, '..', 'bin', 'ai-flow.js');

function run(args) { return execSync(`node ${BIN} ${args}`).toString(); }
function runFail(args) {
  try { execSync(`node ${BIN} ${args}`, { stdio: ['pipe', 'pipe', 'pipe'] }); return null; }
  catch (e) { return e; }
}

describe('CLI basic', () => {
  it('shows help', () => {
    const o = run('--help');
    expect(o).toContain('Usage');
    expect(o).toContain('aiflow');
    expect(o).toContain('init');
    expect(o).toContain('--sync');
  });

  it('shows version', () => {
    const o = run('--version');
    expect(o).toMatch(/\d+\.\d+\.\d+/);
  });

  it('errors on unknown command', () => {
    const e = runFail('unknown-cmd');
    expect(e).not.toBeNull();
  });

  it('shortcut: aiflow "feature" dispatches run', () => {
    const o = run('"test-feature"');
    expect(o).toContain('AI-Flow Run');
    expect(o).toContain('test-feature');
  });
});
```

- [ ] **步骤 6：运行测试验证**

```bash
cd /Users/findream/study/ai-workflow && node --test test/cli.test.js
```

- [ ] **步骤 7：Commit**

```bash
git add package.json bin/ai-flow.js src/detect.js src/utils.js test/cli.test.js
git commit -m "feat: P0 初始化 npm 包和 CLI 入口"
```

### 任务 2：init 命令实现

**文件：**
- 创建：`src/commands/init.js`
- 测试：`test/cli.test.js`（扩展）

- [ ] **步骤 1：编写 init 测试**

```js
// 添加到 test/cli.test.js
const os = require('os');
const fs = require('fs');

describe('CLI init', () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiflow-'));
    fs.mkdirSync(path.join(tmpDir, '.claude'));
  });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('creates skills/ agents/ commands/ workflows/ directories', () => {
    execSync(`node ${BIN} init`, { cwd: tmpDir });
    expect(fs.existsSync(path.join(tmpDir, '.claude', 'skills'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.claude', 'agents'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.claude', 'commands'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.claude', 'workflows'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.claude', 'references'))).toBe(true);
  });

  it('writes CLAUDE.md with AI-Flow bootstrap', () => {
    execSync(`node ${BIN} init`, { cwd: tmpDir });
    const content = fs.readFileSync(path.join(tmpDir, '.claude', 'CLAUDE.md'), 'utf8');
    expect(content).toContain('AI-Flow');
  });
});
```

- [ ] **步骤 2：实现 init 命令**

```js
// src/commands/init.js
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

    // 1. Install enterprise skills
    copyDir(path.join(pkgRoot, 'skills'), path.join(toolDir, 'skills'));
    log('Installed enterprise skills');

    // 2. Install agents
    copyDir(path.join(pkgRoot, 'agents'), path.join(toolDir, 'agents'));
    log('Installed agent definitions');

    // 3. Install commands
    copyDir(path.join(pkgRoot, 'commands'), path.join(toolDir, 'commands'));
    log('Installed custom commands');

    // 4. Install workflows
    copyDir(path.join(pkgRoot, 'workflows'), path.join(toolDir, 'workflows'));
    log('Installed workflow definitions');

    // 5. Install references (output templates)
    copyDir(path.join(pkgRoot, 'templates', 'references'), path.join(toolDir, 'references'));
    log('Installed reference templates');

    // 6. Install settings.json
    const settingsSrc = path.join(pkgRoot, 'templates', 'settings.json');
    const settingsDest = path.join(toolDir, 'settings.json');
    if (fileExists(settingsSrc) && !fileExists(settingsDest)) {
      const settings = readJson(settingsSrc);
      settings['ai-flow'] = { version: pkg.version, installedAt: new Date().toISOString() };
      writeJson(settingsDest, settings);
      log('Created settings.json from template');
    }

    // 7. Install rules
    const rulesSrc = path.join(pkgRoot, 'templates', 'rules');
    if (fileExists(rulesSrc)) {
      copyDir(rulesSrc, path.join(toolDir, 'rules'));
      log('Installed rule templates');
    }

    // 8. Tech preset
    const presetSrc = path.join(pkgRoot, 'templates', 'presets', techStack);
    if (fileExists(presetSrc)) {
      copyDir(presetSrc, path.join(toolDir, 'rules'));
      log(`Installed ${techStack} preset rules`);
    }

    // 9. Bootstrap CLAUDE.md
    const ClaudeMdPath = path.join(toolDir, 'CLAUDE.md');
    if (!fileExists(ClaudeMdPath)) {
      writeText(ClaudeMdPath, generateBootstrap(aiTools, techStack));
    } else {
      const existing = fs.readFileSync(ClaudeMdPath, 'utf8');
      if (!existing.includes('# AI-Flow')) appendText(ClaudeMdPath, '\n' + generateBootstrap(aiTools, techStack));
    }
    log('Updated CLAUDE.md bootstrap');

    // 10. Update .gitignore
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
```

- [ ] **步骤 3：运行测试**

```bash
node --test test/cli.test.js
```

- [ ] **步骤 4：Commit**

```bash
git add src/commands/init.js test/cli.test.js
git commit -m "feat: P0 实现 init 命令"
```

### 任务 3：run 命令 + YAML 解析

**文件：**
- 创建：`src/parse-yaml.js`
- 创建：`src/commands/run.js`
- 测试：`test/cli.test.js`

- [ ] **步骤 1：实现最小 YAML 解析器**

```js
// src/parse-yaml.js
'use strict';
// Minimal YAML parser for workflow files
// Handles: top-level keys, trigger section, stages with nested objects/arrays

function parseYaml(content) {
  const result = { name: '', version: '', trigger: {}, stages: [] };
  const lines = content.split('\n');
  let stage = null;
  let inTrigger = false;
  let inStage = false;
  let inGate = false;
  let inFailure = false;

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;

    if (line.startsWith('name:')) { result.name = line.slice(5).trim().replace(/^["']|["']$/g, ''); continue; }
    if (line.startsWith('version:')) { result.version = line.slice(8).trim().replace(/^["']|["']$/g, ''); continue; }

    if (line.startsWith('trigger:')) { inTrigger = true; inStage = false; continue; }
    if (inTrigger && line.startsWith('  ')) {
      const [k, ...v] = t.split(':');
      if (k && v.length) result.trigger[k.trim()] = v.join(':').trim().replace(/^["']|["']$/g, '');
      continue;
    }

    if (t.startsWith('- name:')) {
      if (stage) result.stages.push(stage);
      stage = { name: t.slice(7).trim(), agent: '', model: 'sonnet', skills: [], input: '', output: '', auto_continue: false, human_gate: null, on_failure: null };
      inStage = true; inTrigger = false; inGate = false; inFailure = false; continue;
    }

    if (inStage && stage && line.startsWith(' ')) {
      if (t.startsWith('skills: [')) {
        const m = t.match(/\[(.+)\]/);
        stage.skills = m ? m[1].split(',').map(s => s.trim().replace(/["']/g, '')) : [];
      } else if (t.startsWith('agent:')) stage.agent = t.slice(6).trim();
      else if (t.startsWith('model:')) stage.model = t.slice(6).trim();
      else if (t.startsWith('input:')) stage.input = t.slice(6).trim();
      else if (t.startsWith('output:')) stage.output = t.slice(7).trim();
      else if (t === 'auto_continue: true') stage.auto_continue = true;
      else if (t.startsWith('human_gate:')) { stage.human_gate = { title: '', notify: '', actions: [] }; inGate = true; inFailure = false; }
      else if (t.startsWith('on_failure:')) { stage.on_failure = { route_to: '', max_retries: 3 }; inFailure = true; inGate = false; }
      else if (inGate && t.startsWith('title:')) stage.human_gate.title = t.slice(6).trim().replace(/"/g, '');
      else if (inGate && t.startsWith('notify:')) stage.human_gate.notify = t.slice(7).trim();
      else if (inGate && t.startsWith('actions:')) {
        const m = t.match(/\[(.+)\]/);
        stage.human_gate.actions = m ? m[1].split(',').map(s => s.trim().replace(/["']/g, '')) : [];
      }
      else if (inFailure && t.startsWith('route_to:')) stage.on_failure.route_to = t.slice(9).trim();
      else if (inFailure && t.startsWith('max_retries:')) stage.on_failure.max_retries = parseInt(t.slice(12).trim(), 10);
    }
  }
  if (stage) result.stages.push(stage);
  return result;
}

module.exports = { parseYaml };
```

- [ ] **步骤 2：实现 run 命令**

```js
// src/commands/run.js
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
```

- [ ] **步骤 3：创建工作流 YAML**（已存在 `workflows/feature-development.yaml`）

- [ ] **步骤 4：Commit**

```bash
git add src/parse-yaml.js src/commands/run.js workflows/feature-development.yaml
git commit -m "feat: P0 实现 run 命令 + YAML 工作流解析"
```

### 任务 4：sync / uninstall / status

- [ ] **步骤 1：实现 sync**

```js
// src/commands/sync.js
'use strict';
const path = require('path');
const { detectAiTools } = require('../detect');
const { log, resolveToolPath, copyDir, getPkgRoot, fileExists, readJson, writeJson } = require('../utils');
const fs = require('fs');

async function run() {
  const targetDir = process.cwd();
  const pkgRoot = getPkgRoot();
  log('=== AI-Flow Sync ===');
  const aiTools = detectAiTools(targetDir);
  for (const tool of aiTools) {
    const td = resolveToolPath(targetDir, tool);
    ['skills', 'agents', 'commands', 'workflows'].forEach(d => {
      const s = path.join(pkgRoot, d);
      if (fileExists(s)) copyDir(s, path.join(td, d));
    });
    const sp = path.join(td, 'references');
    const rs = path.join(pkgRoot, 'templates', 'references');
    if (fileExists(rs)) copyDir(rs, sp);
    const settingsPath = path.join(td, 'settings.json');
    if (fileExists(settingsPath)) {
      const s = readJson(settingsPath);
      const pkg = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'));
      if (s['ai-flow']) { s['ai-flow'].version = pkg.version; s['ai-flow'].lastSynced = new Date().toISOString(); writeJson(settingsPath, s); }
    }
    log(`Synced → ${tool}`);
  }
  log(`Sync complete for: ${aiTools.join(', ')}`);
}

module.exports = { run };
```

- [ ] **步骤 2：实现 uninstall**

```js
// src/commands/uninstall.js
'use strict';
const path = require('path');
const fs = require('fs');
const { detectAiTools } = require('../detect');
const { log, resolveToolPath, fileExists, readJson, writeJson } = require('../utils');

async function run() {
  const targetDir = process.cwd();
  log('=== AI-Flow Uninstall ===');
  for (const tool of detectAiTools(targetDir)) {
    const td = resolveToolPath(targetDir, tool);
    ['skills', 'agents', 'commands', 'workflows', 'references', 'rules'].forEach(d => {
      const dp = path.join(td, d);
      if (fileExists(dp)) { fs.rmSync(dp, { recursive: true, force: true }); log(`Removed ${d} → ${tool}`); }
    });
    const sp = path.join(td, 'settings.json');
    if (fileExists(sp)) { const s = readJson(sp); if (s && s['ai-flow']) { delete s['ai-flow']; writeJson(sp, s); } }
    const cp = path.join(td, 'CLAUDE.md');
    if (fileExists(cp)) {
      let c = fs.readFileSync(cp, 'utf8');
      const i = c.indexOf('# AI-Flow Bootstrap');
      if (i !== -1) { c = c.slice(0, i).trimEnd(); c ? fs.writeFileSync(cp, c + '\n') : fs.unlinkSync(cp); }
    }
  }
  log('AI-Flow uninstalled.');
}

module.exports = { run };
```

- [ ] **步骤 3：实现 status**

```js
// src/commands/status.js
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
```

- [ ] **步骤 4：Commit**

```bash
git add src/commands/sync.js src/commands/uninstall.js src/commands/status.js
git commit -m "feat: P0 实现 sync / uninstall / status 命令"
```

---

## P1：开发 7 个企业扩展 Skills

### 任务 5：企业 Skills 文件

所有 7 个 skills 已编写完成：

| Skill | 文件 | 状态 |
|-------|------|------|
| team-coding-standards | `skills/team-coding-standards/SKILL.md` | 已完成 |
| team-review-checklist | `skills/team-review-checklist/SKILL.md` | 已完成 |
| playwright-e2e | `skills/playwright-e2e/SKILL.md` | 已完成 |
| feishu-integration | `skills/feishu-integration/SKILL.md` | 已完成（基于 lark-cli） |
| gitlab-mr | `skills/gitlab-mr/SKILL.md` | 已完成（基于 glab） |
| devops-trigger | `skills/devops-trigger/SKILL.md` | 已完成 |
| team-agent-orchestrator | `skills/team-agent-orchestrator/SKILL.md` | 已完成（统一 `/aiflow` 命令） |

- [ ] **Commit**

```bash
git add skills/
git commit -m "feat: P1 开发 7 个企业扩展 skills"
```

---

## P2：开发 Agent 定义 + 模板

### 任务 6：Agent 定义

所有 6 个 Agents 已编写完成：

| Agent | 文件 | 特殊能力 |
|-------|------|---------|
| architect | `agents/architect.md` | 飞书云文档创建 + 模板引用 |
| designer | `agents/designer.md` | 飞书云文档创建 + 风险/影响点分析 + 模板引用 |
| coder | `agents/coder.md` | TDD 循环 |
| tester | `agents/tester.md` | Playwright E2E + 失败回退 |
| reviewer | `agents/reviewer.md` | 四维审查 |
| orchestrator | `agents/orchestrator.md` | MR + 飞书通知 + 部署 |

### 任务 7：输出格式模板

| 模板 | 文件 |
|------|------|
| architect-output | `templates/references/architect-output.md` |
| designer-output | `templates/references/designer-output.md`（含风险/影响点分析章节） |

### 任务 8：aiflow Command

**文件：** `commands/aiflow.md`

```markdown
# commands/aiflow.md

# /aiflow 命令

你正在启动 AI-Flow 功能开发工作流。

用户请求: <用户输入的功能描述>

## 执行步骤

1. 解析用户输入的功能名称
2. 生成迭代 ID: `YYYYMMDD-N-<功能名>`
3. 创建迭代输出目录: `.ai-flow/output/iterations/<迭代ID>/`
4. 读取工作流 YAML (`workflows/feature-development.yaml`)
5. 逐 stage 执行:
   - Stage 1: Architect → 输出到 `<迭代ID>/01-requirements.md`
   - 等待用户 approve
   - Stage 2: Designer → 输出到 `<迭代ID>/02-design.md`
   - 等待用户 approve
   - Stage 3: Coder → 编码实现（TDD）
   - Stage 4: Tester → E2E 测试 → 输出到 `<迭代ID>/04-test-report.md`
   - Stage 5: Reviewer → 代码审查 → 输出到 `<迭代ID>/05-review-report.md`
   - 等待用户 approve
   - Stage 6: Orchestrator → MR + 部署 → 输出到 `<迭代ID>/06-deploy-report.md`
   - 等待用户 approve

## 审批方式

- Claude Code 对话中: 回复 `approve` / `reject`
- 终端: 输入 `approve` / `reject`

## 注意事项

- 每个 stage 完成后暂停，等待审批
- 测试失败自动回退给 Coder，最多 3 次
- MR 目标分支: `develop-ai-flow`
- MR 创建后推送通知到飞书群
```

- [ ] **Commit**

```bash
git add agents/ templates/references/ commands/aiflow.md
git commit -m "feat: P2 开发 Agent 定义 + 模板 + aiflow command"
```

---

## P3：Templates + Hooks

### 任务 9：项目配置模板

**文件：**
- `templates/settings.json`
- `templates/CLAUDE.md`
- `templates/rules/coding-standards.md`
- `templates/rules/review-checklist.md`
- `templates/rules/git-workflow.md`

- [x] **步骤 1：创建 settings.json 模板**

```json
{
  "ai-flow": {
    "version": "0.1.0",
    "installedAt": "",
    "git": {
      "workflow": "gitflow",
      "mainBranch": "main",
      "developBranch": "develop",
      "aiFlowBranch": "develop-ai-flow"
    },
    "feishu": {
      "chatId": "",
      "docFolderId": ""
    }
  }
}
```

- [x] **步骤 2：创建 CLAUDE.md 模板**

```markdown
# AI-Flow 团队配置

## 团队编码规范
遵守 `.claude/rules/coding-standards.md`

## Git 工作流
遵守 `.claude/rules/git-workflow.md`

## AI-Flow 工作流
使用 `/aiflow <feature-name>` 启动功能开发工作流

## 输出目录
所有 AI 生成的文档存放在 `.ai-flow/output/iterations/` 目录下
```

- [x] **步骤 3：创建规则模板**

从 [everything-claude-code](https://github.com/affaan-m/everything-claude-code) 复制了完整的规则模板：

- `templates/rules/coding-standards.md` - 团队编码规范
- `templates/rules/review-checklist.md` - 团队审查清单
- `templates/rules/git-workflow.md` - Git 工作流规范
- `templates/presets/typescript/common/` - TypeScript 通用规则 (5 files)
- `templates/presets/typescript/typescript/` - TypeScript 语言规则 (5 files)
- `templates/presets/python/common/` - Python 通用规则 (5 files)
- `templates/presets/python/python/` - Python 语言规则 (5 files)
- `templates/presets/java/common/` - Java 通用规则 (5 files)
- `templates/presets/java/java/` - Java 语言规则 (5 files)

- [x] **步骤 4：创建 hooks/session-start**

```
# hooks/session-start
# AI-Flow bootstrap - 每次会话启动时加载团队配置
```

- [ ] **步骤 5：Commit**

```bash
git add templates/ hooks/
git commit -m "feat: P3 添加项目配置模板和 bootstrap hook"
```

---

## 执行优先级

```
P0 (任务 1-4) → 可运行的安装器和 CLI
  ↓
P1 (任务 5) → 7 个企业 skills（已完成）
  ↓
P2 (任务 6-8) → Agent 定义 + 命令（已完成）
  ↓
P3 (任务 9) → 模板 + hook（已完成）
```

---

## 计划自检

| 检查项 | 状态 |
|--------|------|
| 规格覆盖度 | 设计文档第 2-13 节全部有对应任务 |
| 占位符扫描 | 无 TODO/待定，所有步骤含具体代码 |
| 类型一致性 | 文件路径、命令、配置结构在各任务间一致 |
| 分支命名 | `develop-ai-flow` 统一使用 |
| 命令统一 | `aiflow` 三个端一致 |
