# AI-Flow 企业 AI 工作流系统

AI-Flow 是一套基于 [obra/superpowers](https://github.com/obra/superpowers) 的企业级 AI 驱动开发工作流系统，打通需求分析 → 架构设计 → 编码实现 → E2E 测试 → 代码审查 → 合并部署的完整生命周期。

## 核心特性

- **6 个 Agent 角色**: Architect / Designer / Coder / Tester / Reviewer / Orchestrator
- **飞书 + 飞书 CLI 驱动** + 本地 CLI 驱动双模式
- **npx 一键安装**: `npx ai-flow init`
- **渐进式人机协同**: 需求确认、方案审批、审查通过、部署确认 4 个卡点
- **零侵入**: 只写项目 `.claude/`，不碰 `~/.claude/` 个人配置
- **多平台**: 适配 Claude Code / OpenCode / Cursor

## 快速开始

```bash
# 初始化当前项目
npx ai-flow init --tool claude-code

# 启动功能开发工作流
npx aiflow "用户登录"

# 同步团队最新配置
npx ai-flow --sync

# 卸载
npx ai-flow --uninstall
```

## 仓库结构

```
ai-flow/
├── bin/ai-flow.js                  ← CLI 入口
├── src/commands/                   ← 命令实现 (init/run/sync/status/uninstall)
├── src/detect.js                   ← AI 工具 + 技术栈检测
├── src/utils.js                    ← 工具函数
├── skills/                         ← 7 个企业扩展 skills
│   ├── team-coding-standards/      ← 团队编码规范
│   ├── team-review-checklist/      ← 团队审查清单
│   ├── playwright-e2e/             ← Playwright E2E 测试
│   ├── feishu-integration/         ← 飞书集成
│   ├── gitlab-mr/                  ← GitLab MR 工作流
│   ├── devops-trigger/             ← DevOps 部署触发
│   └── team-agent-orchestrator/    ← 多 Agent 编排
├── agents/                         ← 6 个 Agent 定义
│   ├── architect.md                ← 需求分析 → 01-requirements.md
│   ├── designer.md                 ← 架构设计 → 02-design.md
│   ├── coder.md                    ← 编码实现 (TDD)
│   ├── tester.md                   ← E2E 测试 → 04-test-report.md
│   ├── reviewer.md                 ← 代码审查 → 05-review-report.md
│   └── orchestrator.md             ← MR + 部署 → 06-deploy-report.md
├── commands/aiflow.md              ← /aiflow 自定义命令
├── workflows/feature-development.yaml ← 工作流 YAML 定义
├── templates/
│   ├── settings.json               ← 团队配置模板
│   ├── presets/typescript|python|java ← 技术栈预设
│   ├── references/                 ← Agent 输出格式模板
│   └── rules/                      ← 团队规则模板
└── hooks/session-start             ← 会话启动 hook
```

## 输出目录规范

所有 Agent 产物存放在迭代目录下，按 `日期-序号-功能名` 命名：

```
.ai-flow/output/iterations/<YYYYMMDD>-<序号>-<功能名>/
├── 01-requirements.md    ← Architect 输出
├── 02-design.md          ← Designer 输出
├── 04-test-report.md     ← Tester 输出
├── 05-review-report.md   ← Reviewer 输出
└── 06-deploy-report.md   ← Orchestrator 输出
```

示例路径: `.ai-flow/output/iterations/20260506-1-user-login/01-requirements.md`

## 工作流阶段

| 阶段 | Agent | 技能 | 人工卡点 | 输出 |
|------|-------|------|----------|------|
| 需求分析 | Architect | brainstorming | ✅ 需求确认 | 结构化需求文档 |
| 架构设计 | Designer | writing-plans | ✅ 方案审批 | 设计文档 + 任务列表 |
| 编码实现 | Coder | TDD + executing-plans | ❌ 自动 | 代码 + 单元测试 |
| E2E 测试 | Tester | playwright-e2e | ❌ 自动 | 测试报告 (失败回退 Coder 3 次) |
| 代码审查 | Reviewer | requesting-code-review | ✅ 审查通过 | 四维审查报告 |
| 合并部署 | Orchestrator | finishing-a-development-branch | ✅ 部署确认 | MR + 部署报告 |

## 飞书集成

配置 `.claude/settings.json`：

```json
{
  "ai-flow": {
    "feishu": {
      "chatId": "<群聊 ID>",
      "docFolderId": "<飞书云文档目录 ID>"
    }
  }
}
```

- 配置 `chatId`: 卡点通知推送到飞书群
- 配置 `docFolderId`: Architect/Designer 文档同时发布到飞书云文档
- 未配置则走本地终端交互和文件存储

## 可用 Skills

Skills 位于 `.claude/skills/` 目录，每个 skill 有独立的 `SKILL.md` 文件。

### 内置 superpowers 核心 skills

- **brainstorming**: 创造性工作之前使用——创建功能、构建组件、添加功能或修改行为
- **chinese-code-review**: 中文代码审查规范——保持专业严谨同时符合国内团队文化
- **chinese-commit-conventions**: 中文 Git 提交规范——commit message 规范和 changelog 自动化
- **chinese-documentation**: 中文技术文档写作规范——排版、术语、结构到位
- **chinese-git-workflow**: 适配国内 Git 平台——Gitee、Coding、极狐 GitLab、CNB
- **dispatching-parallel-agents**: 2 个以上独立任务时使用
- **executing-plans**: 执行书面实现计划，设审查检查点
- **finishing-a-development-branch**: 实现完成、测试通过后引导开发收尾
- **mcp-builder**: 构建生产级 MCP 工具
- **receiving-code-review**: 收到代码审查反馈后使用
- **requesting-code-review**: 完成任务、重要功能或合并前使用
- **subagent-driven-development**: 在当前会话中执行包含独立任务的计划
- **systematic-debugging**: 遇到 bug、测试失败时使用
- **test-driven-development**: 写功能或修复 bug 时使用，先写测试
- **using-git-worktrees**: 创建隔离 git worktree 时使用
- **using-superpowers**: 入口引导——确立如何查找和使用技能
- **verification-before-completion**: 宣称完成前必须运行验证命令
- **workflow-runner**: 运行 agency-orchestrator YAML 工作流
- **writing-plans**: 有多步骤任务规格时使用，在写代码之前
- **writing-skills**: 创建新技能、编辑现有技能时使用

### 企业扩展 skills

- **team-coding-standards**: 团队编码规范（TS/Python/Java）
- **team-review-checklist**: 团队审查清单
- **playwright-e2e**: Playwright E2E 测试规范
- **feishu-integration**: 飞书集成（需求拉取/通知/审批/云文档）
- **gitlab-mr**: GitLab MR 工作流
- **devops-trigger**: DevOps 云平台触发
- **team-agent-orchestrator**: 多 Agent 编排

## 核心规则

1. **技能优先** — 收到任务时检查是否有匹配的 skill，哪怕 1% 可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令
5. **飞书优先** — 配置了飞书时走飞书交互，未配置则走本地终端

## 如何使用

当任务匹配某个 skill 时，使用 `Skill` 工具加载对应 skill 并严格遵循其流程。绝不要用 Read 工具读取 SKILL.md 文件。
