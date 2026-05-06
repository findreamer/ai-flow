# AI-Flow 企业 AI 工作流系统 — 需求文档

> **状态**: 规划阶段  
> **创建日期**: 2026-05-06  
> **目标**: 基于 `obra/superpowers` 构建企业级 AI 驱动开发工作流

---

## 1. 项目背景

### 1.1 现状

- 团队 30+ 人开发团队
- 技术栈: TypeScript（前端）+ Python/Java（后端）
- 工具链: GitLab（代码托管）+ 自建 DevOps 云平台 + 飞书（沟通/项目管理）
- 已使用 Claude Code，处于 L2 水平（会配置 CLAUDE.md、自定义命令、MCP）

### 1.2 痛点

- 每个项目独立配置 Claude Code，复制粘贴配置维护成本高
- 团队缺乏统一的 AI 工作流标准（编码规范、审查标准不统一）
- AI 介入开发流程的边界不清晰，缺乏端到端自动化
- 同事使用不同 AI 工具（Claude Code / OpenCode / Cursor），配置不互通

### 1.3 目标

- 构建一套 **可复用、可同步、零侵入** 的团队 AI 工作流配置系统
- 打通业务开发完整生命周期：需求分析 → 架构设计 → 编码实现 → 代码审查 → 测试（Playwright E2E）→ 部署
- 支持多 AI 工具平台（Claude Code、OpenCode、Cursor 等）

---

## 2. 整体架构

### 2.1 架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        飞书 (沟通 & 通知)                             │
│              PR 通知 / 审查结果 / 部署状态 / 人工确认                  │
└───────────────────────┬─────────────────────────────────────────────┘
                        │ Webhook / Bot
┌───────────────────────▼─────────────────────────────────────────────┐
│                    人工卡点控制台 (Human-in-the-Loop)                  │
│  需求确认 → 方案审批 → 审查通过 → 部署确认                            │
└───────────────────────┬─────────────────────────────────────────────┘
                        │ 审批指令
┌───────────────────────▼─────────────────────────────────────────────┐
│                    AI-Flow 编排层                                     │
│  🧠 Architect（需求分析 + 架构设计）                                   │
│  💻 Coder（编码实现 + 测试）                                          │
│  🔍 Reviewer（代码审查）                                              │
└───────────────────────┬─────────────────────────────────────────────┘
                        │ Git 操作 / 文件读写
┌───────────────────────▼─────────────────────────────────────────────┐
│                    GitLab + DevOps 云平台                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 核心设计原则

| 原则                 | 说明                                                 |
| -------------------- | ---------------------------------------------------- |
| **基于 superpowers** | 复用 obra/superpowers 14 个核心 skills，不重复造轮子 |
| **零侵入**           | 只写项目 `.claude/`，不碰 `~/.claude/` 用户个人配置  |
| **多平台支持**       | 一条命令适配 Claude Code / OpenCode / Cursor 等      |
| **npx 安装**         | `npx ai-flow` 一条命令完成初始化                     |
| **团队共享**         | 团队配置集中管理，一键同步到所有项目                 |
| **人工卡点**         | 关键环节需人工确认，非全自动                         |

---

## 3. 安装器设计

### 3.1 CLI 命令

```bash
# 初始化（在项目目录下）
npx ai-flow

# 指定 AI 工具
npx ai-flow --tool claude-code
npx ai-flow --tool opencode

# 同步团队最新配置
npx ai-flow --sync

# 卸载
npx ai-flow --uninstall

# 查看状态
npx ai-flow --status
```

### 3.2 安装流程

```
npx ai-flow
    │
    ├── 1. 检测项目使用的 AI 工具（检查 .claude / .opencode / .cursor 等）
    ├── 2. 检测项目技术栈（package.json / pyproject.toml / pom.xml）
    ├── 3. 安装 superpowers 核心 skills（14个）
    ├── 4. 安装企业扩展 skills
    ├── 5. 安装企业 Agent 定义
    ├── 6. 安装企业 Commands
    ├── 7. 安装团队配置模板
    ├── 8. 生成 bootstrap（CLAUDE.md 追加）
    └── 9. 更新 .gitignore
```

### 3.3 借鉴来源

安装器设计借鉴 `superpowers-zh`（https://github.com/jnMetaCode/superpowers-zh）的 `npx` 安装模式：

- `bin/superpowers-zh.js` 作为 CLI 入口
- 自动检测工具类型
- 递归复制 skills 到项目本地目录
- 生成 bootstrap 文件
- 支持 `--uninstall` 干净卸载

---

## 4. 仓库结构

```
ai-flow/
├── package.json
├── bin/
│   └── ai-flow.js                  ← CLI 入口
│
├── skills/                         ← 企业扩展 skills（继承 superpowers 核心）
│   ├── team-coding-standards/      ← 团队编码规范
│   ├── team-review-checklist/      ← 团队审查清单
│   ├── playwright-e2e/             ← Playwright E2E 测试
│   ├── feishu-integration/         ← 飞书集成
│   ├── gitlab-mr/                  ← GitLab MR 工作流
│   ├── devops-trigger/             ← DevOps 云平台触发
│   └── team-agent-orchestrator/    ← 多 Agent 编排（L3-L4 核心）
│
├── agents/                         ← 企业 Agent 定义
│   ├── architect.md                ← 架构师 Agent
│   ├── coder.md                    ← 编码 Agent
│   ├── reviewer.md                 ← 审查 Agent
│   └── tester.md                   ← 测试 Agent
│
├── commands/                       ← 企业自定义命令
│   ├── analyze-requirement.md      ← /analyze-requirement
│   ├── design-architecture.md      ← /design-architecture
│   ├── implement-feature.md        ← /implement-feature
│   └── review-code.md              ← /review-code
│
├── templates/                      ← 团队配置模板
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
    └── session-start               ← 企业 bootstrap hook
```

---

## 5. Agent 角色设计

### 5.1 Architect（需求分析 + 架构设计）

| 属性     | 说明                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| 模型     | sonnet                                                                                 |
| 工具权限 | Read, Write, Bash(git _), Bash(npm run lint:_), Bash(python3 -m pytest --collect-only) |
| 输入     | 飞书需求文档 / MR description                                                          |
| 输出     | 结构化需求文档 + 架构设计文档 + 任务列表                                               |
| 人工卡点 | ✅ 需求确认 + 方案审批                                                                 |

**工作流程**:

1. 读取需求文档，识别核心业务目标、边界条件、非功能需求
2. 拆分为 User Story + 验收标准（Given/When/Then）
3. 分析现有代码结构，设计接口定义
4. 拆解为 2-5 分钟/个的编码任务

### 5.2 Coder（编码实现 + 测试）

| 属性     | 说明                                             |
| -------- | ------------------------------------------------ |
| 模型     | sonnet                                           |
| 工具权限 | Read, Write, Edit, Bash, WebFetch                |
| 输入     | 任务列表（从 Architect 输出）                    |
| 输出     | 代码 + 单元测试 + Playwright E2E 测试 + Git 提交 |
| 人工卡点 | ❌ 全自动                                        |

**工作流程**:

1. 读取任务文档，理解目标、文件路径、代码骨架
2. TDD 循环：写 failing test → 确认失败 → 写实现 → 确认通过 → 重构 → 提交
3. 每个任务至少 1 个单元测试 + 1 个 E2E 测试
4. Commit message 遵循 conventional commits

### 5.3 Reviewer（代码审查）

| 属性     | 说明                                                                |
| -------- | ------------------------------------------------------------------- |
| 模型     | sonnet                                                              |
| 工具权限 | Read, Bash(git diff _), Bash(npm run lint:_), Bash(npm run test:\*) |
| 输入     | 代码 Diff + 架构设计文档                                            |
| 输出     | 四维审查报告（规范/安全/性能/架构一致性）                           |
| 人工卡点 | ✅ 审查通过                                                         |

**审查维度**:

1. 规范检查：编码规范、命名、文件组织
2. 安全审查：注入漏洞、敏感数据、输入验证
3. 性能审查：N+1 查询、重渲染、大数据量处理
4. 架构一致性：实现与设计一致、无 scope creep

---

## 6. 人工卡点设计

```
[需求文档] → [Architect 拆解] → 🔴 卡点1: 需求确认
    ↓ 确认通过
[Architect 设计] → 🔴 卡点2: 方案审批
    ↓ 审批通过
[Coder 编码] → [Tester 测试] → [Reviewer 审查] → 🔴 卡点3: 审查通过
    ↓ 审查通过 → MR 合并 → 🔴 卡点4: 部署确认
    ↓ 确认部署 → DevOps 平台部署
```

**卡点触发方式**:

- 飞书机器人推送通知 + 审批按钮
- 或在终端输入 `approve` / `reject`

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

## 8. 与 superpowers 的关系

### 8.1 复用 superpowers 核心 skills（14个）

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

### 8.2 企业扩展 skills（7个）

| Skill                   | 用途                           |
| ----------------------- | ------------------------------ |
| team-coding-standards   | 团队编码规范（TS/Python/Java） |
| team-review-checklist   | 团队审查清单                   |
| playwright-e2e          | Playwright E2E 测试规范        |
| feishu-integration      | 飞书集成（需求拉取/通知/审批） |
| gitlab-mr               | GitLab MR 工作流               |
| devops-trigger          | DevOps 云平台触发              |
| team-agent-orchestrator | 多 Agent 编排（L3-L4 核心）    |

### 8.3 更新策略

- **superpowers 核心**: 定期从 `obra/superpowers` 同步（git subtree 或手动复制）
- **企业扩展**: 独立版本管理，git push 即更新
- **团队配置**: 开发者 `npx ai-flow --sync` 拉取最新配置

---

## 9. 多平台支持

| 平台         | 安装路径                                     | 安装方式 |
| ------------ | -------------------------------------------- | -------- |
| Claude Code  | `.claude/skills/` + `.claude/agents/`        | npx 安装 |
| OpenCode     | `.opencode/skills/` + `opencode.json` plugin | npx 安装 |
| Cursor       | `.cursor/skills/`                            | npx 安装 |
| Hermes Agent | `.hermes/skills/`                            | npx 安装 |
| Trae         | `.trae/skills/`                              | npx 安装 |
| 其他         | 按需扩展                                     | npx 安装 |

**核心原则**: skills 内容相同，只调整安装路径和 bootstrap 方式。

---

## 10. 分阶段实施路径

| 阶段   | 目标                               | 周期 | 产出                                                         |
| ------ | ---------------------------------- | ---- | ------------------------------------------------------------ |
| **P0** | 搭建仓库框架 + 安装器              | 1 周 | 可运行的 npx 安装器                                          |
| **P1** | 开发 3 个核心企业 skills           | 2 周 | team-coding-standards, team-review-checklist, playwright-e2e |
| **P2** | 开发 Agent 定义 + Commands         | 1 周 | architect/coder/reviewer/tester + 自定义命令                 |
| **P3** | 开发 team-agent-orchestrator skill | 2 周 | L3-L4 多 Agent 编排工作流                                    |
| **P4** | 飞书 + GitLab 集成 skills          | 1 周 | feishu-integration, gitlab-mr                                |
| **P5** | 团队配置模板 + 同步机制            | 1 周 | templates/ + --sync 功能                                     |

---

## 11. 待确认事项

- [ ] 企业 GitLab 仓库地址
- [ ] 团队编码规范具体内容
- [ ] Git 工作流类型（Git Flow / GitHub Flow / Trunk-Based）
- [ ] MVP 从哪个场景切入（代码审查 / 编码实现 / 测试）
- [ ] Hermes 部署方式（本地 / 共享服务器）
- [ ] superpowers 同步方式（手动 / git subtree）

---

## 12. 参考资源

- [obra/superpowers](https://github.com/obra/superpowers) — 核心技能库
- [jnMetaCode/superpowers-zh](https://github.com/jnMetaCode/superpowers-zh) — 中文增强版 + npx 安装器参考
- [Claude Code 官方文档](https://code.claude.com/docs)
- [OpenCode 文档](https://opencode.ai)
