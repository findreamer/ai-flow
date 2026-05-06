# AI-Flow 企业 AI 工作流系统 — 设计文档

> **日期**: 2026-05-06
> **状态**: 设计阶段
> **来源**: 基于 `plan/requirements.md` 头脑风暴后的渐进式设计方案

---

## 1. 项目概述

构建一套 **可复用、可同步、零侵入** 的团队 AI 工作流系统，打通"需求分析 → 架构设计 → 编码实现 → E2E 测试 → 代码审查 → 部署"完整生命周期。

**核心定位**：基于 `obra/superpowers` 核心 skills + 企业扩展 skills，通过渐进式混合架构（YAML 工作流 → 独立编排引擎），实现"AI 主导、人工审核"的 L3 级别工作流。

---

## 2. 整体架构（渐进式）

```
┌─────────────────────────────────────────────────────────────────┐
│  飞书 Bot / CLI                                                   │
│  /aiflow 实现 xxx          npx ai-flow run --feature "xxx"      │
└───────────────────────┬─────────────────────────────────────────┘
                        │ 触发
┌───────────────────────▼─────────────────────────────────────────┐
│  入口层                                                           │
│  ai-flow.js (CLI 入口)                                           │
│  ├── detect tool → claude-code / opencode                       │
│  ├── install skills/agents/templates                             │
│  └── dispatch to workflow runner                                 │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│  编排层 — 渐进演进                                                │
│                                                                  │
│  P0-P2: YAML 工作流 + workflow-runner (本地会话执行)              │
│    Architect → Designer → Coder → Tester → Reviewer (串行)      │
│                                                                  │
│  P3+: 状态持久化 → 独立编排引擎                                   │
│    支持并行、重试、断点续跑                                       │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│  卡点层                                                          │
│  飞书审批卡片 + 终端 approve/reject                               │
│  人工确认 → workflow 继续                                        │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│  执行层                                                          │
│  GitLab MR + 本地文件操作 + 测试运行                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Agent 角色设计

### 3.1 Architect（需求分析）

| 属性     | 说明                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| 模型     | sonnet                                                                                 |
| 工具权限 | Read, Write, Bash(git _), Bash(npm run lint:_), Bash(python3 -m pytest --collect-only) |
| 输入     | 飞书需求文档 / CLI 输入                                                                 |
| 输出     | 结构化需求文档（User Story + Given/When/Then 验收标准）                                 |
| 人工卡点 | ✅ 需求确认                                                                             |

**工作流程**：
1. 读取需求文档，识别核心业务目标、边界条件、非功能需求
2. 拆分为 User Story + 验收标准（Given/When/Then）

### 3.2 Designer（架构设计）

| 属性     | 说明                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| 模型     | sonnet                                                                                 |
| 工具权限 | Read, Write, Bash(git _), Bash(npm run lint:_), Bash(python3 -m pytest --collect-only) |
| 输入     | 结构化需求文档（Architect 输出）                                                        |
| 输出     | 架构设计文档 + 接口定义 + 任务拆解（2-5 分钟/个）                                        |
| 人工卡点 | ✅ 方案审批                                                                             |

**工作流程**：
1. 分析现有代码结构
2. 设计接口定义
3. 拆解为 2-5 分钟/个的编码任务

### 3.3 Coder（编码实现）

| 属性     | 说明                                             |
| -------- | ------------------------------------------------ |
| 模型     | sonnet                                           |
| 工具权限 | Read, Write, Edit, Bash, WebFetch                |
| 输入     | 任务列表（Designer 输出）                         |
| 输出     | 代码 + 单元测试 + Git 提交                         |
| 人工卡点 | ❌ 全自动                                         |

**工作流程**：
1. 读取任务文档，理解目标、文件路径、代码骨架
2. TDD 循环：写 failing test → 确认失败 → 写实现 → 确认通过 → 重构 → 提交
3. 每个任务至少 1 个单元测试
4. Commit message 遵循 conventional commits

### 3.4 Tester（E2E 测试）

| 属性     | 说明                                                        |
| -------- | ----------------------------------------------------------- |
| 模型     | sonnet                                                      |
| 工具权限 | Read, Write, Bash, WebFetch                                 |
| 输入     | 功能代码 + 结构化需求文档                                   |
| 输出     | Playwright E2E 测试 + 测试报告                              |
| 人工卡点 | ❌ 全自动（失败自动回退给 Coder）                             |

**工作流程**：
1. 基于需求文档的验收标准编写 Playwright E2E 测试
2. 运行测试，记录结果
3. 测试失败自动回退给 Coder 修复

### 3.5 Reviewer（代码审查）

| 属性     | 说明                                                                |
| -------- | ------------------------------------------------------------------- |
| 模型     | sonnet                                                              |
| 工具权限 | Read, Bash(git diff _), Bash(npm run lint:_), Bash(npm run test:\*) |
| 输入     | 代码 Diff + 架构设计文档                                            |
| 输出     | 四维审查报告（规范/安全/性能/架构一致性）                           |
| 人工卡点 | ✅ 审查通过                                                          |

**审查维度**：
1. 规范检查：编码规范、命名、文件组织
2. 安全审查：注入漏洞、敏感数据、输入验证
3. 性能审查：N+1 查询、重渲染、大数据量处理
4. 架构一致性：实现与设计一致、无 scope creep

### 3.6 Orchestrator（合并部署）

| 属性     | 说明                                          |
| -------- | --------------------------------------------- |
| 模型     | haiku                                         |
| 工具权限 | Read, Bash(git _), Bash(npx ai-flow deploy:_) |
| 输入     | 审查通过的代码                                |
| 输出     | MR 合并 + DevOps 部署触发                      |
| 人工卡点 | ✅ 部署确认                                    |

---

## 4. YAML 工作流定义（MVP）

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

---

## 5. 仓库结构

```
ai-flow/
├── package.json
├── bin/
│   └── ai-flow.js                  # CLI 入口
│
├── skills/                         # 企业扩展 skills
│   ├── team-coding-standards/
│   ├── team-review-checklist/
│   ├── playwright-e2e/
│   ├── feishu-integration/
│   ├── gitlab-mr/
│   ├── devops-trigger/
│   └── team-agent-orchestrator/
│
├── agents/                         # Agent 定义
│   ├── architect.md
│   ├── designer.md
│   ├── coder.md
│   ├── tester.md
│   ├── reviewer.md
│   └── orchestrator.md
│
├── commands/                       # 自定义命令
│   ├── analyze-requirement.md
│   ├── design-architecture.md
│   ├── implement-feature.md
│   └── review-code.md
│
├── workflows/                      # YAML 工作流定义
│   └── feature-development.yaml
│
├── templates/                      # 团队配置模板
│   ├── settings.json
│   ├── CLAUDE.md
│   ├── rules/
│   │   ├── coding-standards.md
│   │   ├── review-checklist.md
│   │   └── git-workflow.md
│   └── presets/
│       ├── typescript/
│       ├── python/
│       └── java/
│
└── hooks/
    └── session-start               # 企业 bootstrap hook
```

---

## 6. 分阶段实施路径

| 阶段   | 目标                               | 周期 | 产出                                                         |
| ------ | ---------------------------------- | ---- | ------------------------------------------------------------ |
| **P0** | 搭建仓库框架 + 安装器              | 1 周 | 可运行的 npx 安装器                                          |
| **P1** | 开发 3 个核心企业 skills           | 2 周 | team-coding-standards, team-review-checklist, playwright-e2e |
| **P2** | 开发 Agent 定义 + 工作流 YAML      | 1 周 | architect/designer/coder/tester/reviewer/orchestrator + 工作流 |
| **P3** | 开发 team-agent-orchestrator skill | 2 周 | L3-L4 多 Agent 编排工作流                                    |
| **P4** | 飞书 + GitLab 集成 skills          | 1 周 | feishu-integration, gitlab-mr                                |
| **P5** | 团队配置模板 + 同步机制            | 1 周 | templates/ + `--sync` 功能                                    |

---

## 7. 配置分层

```
~/.claude/                          ← 用户个人配置（完全不受影响）
     ↓
.claude/settings.json               ← 团队基础配置（从模板复制）
     ↓
.claude/settings.local.json         ← 项目特定设置（最高优先级）
```

```
~/.claude/CLAUDE.md                 ← 个人上下文（始终加载）
     +
.claude/CLAUDE.md                   ← 团队上下文（从模板复制）
     +
.claude/CLAUDE.local.md             ← 项目上下文（项目特定）
```

**关键**: CLAUDE.md 是追加而非覆盖，个人配置和团队配置合并，互不影响。

---

## 8. 多平台支持

| 平台         | 安装路径                                     | 安装方式 |
| ------------ | -------------------------------------------- | -------- |
| Claude Code  | `.claude/skills/` + `.claude/agents/`        | npx 安装 |
| OpenCode     | `.opencode/skills/` + `opencode.json` plugin | npx 安装 |
| Cursor       | `.cursor/skills/`                            | npx 安装 |
| Hermes Agent | `.hermes/skills/`                            | npx 安装 |
| Trae         | `.trae/skills/`                              | npx 安装 |

核心原则：skills 内容相同，只调整安装路径和 bootstrap 方式。

---

## 9. 安装流程

```
npx ai-flow
    │
    ├── 1. 检测项目使用的 AI 工具（检查 .claude / .opencode / .cursor 等）
    ├── 2. 检测项目技术栈（package.json / pyproject.toml / pom.xml）
    ├── 3. 安装 superpowers 核心 skills（14个）
    ├── 4. 安装企业扩展 skills
    ├── 5. 安装企业 Agent 定义
    ├── 6. 安装企业 Commands
    ├── 7. 安装工作流 YAML
    ├── 8. 安装团队配置模板
    ├── 9. 生成 bootstrap（CLAUDE.md 追加）
    └── 10. 更新 .gitignore
```

---

## 10. 与 superpowers 的关系

### 10.1 复用 superpowers 核心 skills（14个）

| Skill                          | 用途           |
| ------------------------------ | -------------- |
| brainstorming                  | 需求分析       |
| writing-plans                  | 写实施计划     |
| subagent-driven-development    | 子代理驱动开发 |
| test-driven-development        | TDD            |
| systematic-debugging           | 系统调试       |
| requesting-code-review         | 代码审查       |
| receiving-code-review          | 接收审查反馈   |
| using-git-worktrees            | Git worktrees  |
| finishing-a-development-branch | 完成开发分支   |
| dispatching-parallel-agents    | 并行代理       |
| executing-plans                | 执行计划       |
| verification-before-completion | 完成前验证     |
| writing-skills                 | 写新 skill     |
| using-superpowers              | 引导/入口      |

### 10.2 企业扩展 skills（7个）

| Skill                   | 用途                           |
| ----------------------- | ------------------------------ |
| team-coding-standards   | 团队编码规范（TS/Python/Java） |
| team-review-checklist   | 团队审查清单                   |
| playwright-e2e          | Playwright E2E 测试规范        |
| feishu-integration      | 飞书集成（需求拉取/通知/审批） |
| gitlab-mr               | GitLab MR 工作流               |
| devops-trigger          | DevOps 云平台触发              |
| team-agent-orchestrator | 多 Agent 编排（L3-L4 核心）    |

### 10.3 更新策略

- **superpowers 核心**: 定期从 `obra/superpowers` 同步（git subtree 或手动复制）
- **企业扩展**: 独立版本管理，git push 即更新
- **团队配置**: 开发者 `npx ai-flow --sync` 拉取最新配置

---

## 11. 卡点机制

```
[需求文档] → [Architect 需求分析] → 🔴 卡点1: 需求确认
    ↓ 确认通过
[Designer 架构设计] → 🔴 卡点2: 方案审批
    ↓ 审批通过
[Coder 编码] → [Tester E2E 测试] → (失败自动回退 Coder)
    ↓ 测试通过
[Reviewer 代码审查] → 🔴 卡点3: 审查通过
    ↓ 审查通过 → MR 合并 → 🔴 卡点4: 部署确认
    ↓ 确认部署 → DevOps 平台部署
```

**卡点触发方式**：
- 飞书机器人推送审批卡片 + approve/reject 按钮
- 或在终端输入 `approve` / `reject`

**失败回退机制**：
- Tester 测试失败 → 自动回退给 Coder，最多重试 3 次
- Reviewer 审查不通过 → 回退给 Coder，直到审查通过

---

## 12. CLI 命令

```bash
# 初始化（在项目目录下）
npx ai-flow

# 指定 AI 工具
npx ai-flow --tool claude-code
npx ai-flow --tool opencode

# 触发工作流
npx ai-flow run --feature "用户登录"

# 同步团队最新配置
npx ai-flow --sync

# 卸载
npx ai-flow --uninstall

# 查看状态
npx ai-flow --status
```

---

## 13. 设计原则

| 原则                 | 说明                                                 |
| -------------------- | ---------------------------------------------------- |
| **基于 superpowers** | 复用 obra/superpowers 14 个核心 skills，不重复造轮子 |
| **零侵入**           | 只写项目 `.claude/`，不碰 `~/.claude/` 用户个人配置  |
| **多平台支持**       | 一条命令适配 Claude Code / OpenCode / Cursor 等      |
| **npx 安装**         | `npx ai-flow` 一条命令完成初始化                     |
| **团队共享**         | 团队配置集中管理，一键同步到所有项目                 |
| **人工卡点**         | 关键环节需人工确认，非全自动                         |
| **渐进演进**         | P0-P2 YAML 工作流起步，P3+ 引入独立编排引擎          |
| **中心配置仓库**     | 单一配置源，各项目 `--sync` 同步                     |
| **YAGNI**            | 严格从 MVP 出发，不预设未来功能                      |
