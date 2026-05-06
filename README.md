# AI-Flow

> 企业级 AI 驱动开发工作流系统，打通需求分析 → 架构设计 → 编码实现 → E2E 测试 → 代码审查 → 合并部署的完整生命周期。

## 特性

- **6 个 Agent 角色**: Architect / Designer / Coder / Tester / Reviewer / Orchestrator
- **双驱动模式**: 飞书 CLI + 本地 CLI
- **渐进式人机协同**: 关键环节人工卡点，非全自动
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

# 查看安装状态
npx ai-flow --status

# 卸载
npx ai-flow --uninstall
```

## 工作流

```
飞书需求文档 ──→ CLI 输入 ──→ /aiflow
                                     │
                                     ▼
                     ┌───────────────────────────────────┐
                     │  1. Architect 需求分析             │
                     │     结构化需求文档 (01-requirements)│
                     │     🔴 卡点: 需求确认              │
                     └────────────────┬──────────────────┘
                                      ▼
                     ┌───────────────────────────────────┐
                     │  2. Designer 架构设计               │
                     │     设计文档 + 任务列表 (02-design) │
                     │     🔴 卡点: 方案审批               │
                     └────────────────┬──────────────────┘
                                      ▼
                     ┌───────────────────────────────────┐
                     │  3. Coder 编码实现 (TDD)            │
                     │     代码 + 单元测试 + Git 提交      │
                     └────────────────┬──────────────────┘
                                      ▼
                     ┌───────────────────────────────────┐
                     │  4. Tester E2E 测试               │
                     │     测试报告 (04-test-report)       │
                     │     ❌ 失败 → 回退 Coder (最多 3 次)│
                     └────────────────┬──────────────────┘
                                      ▼
                     ┌───────────────────────────────────┐
                     │  5. Reviewer 代码审查               │
                     │     四维审查报告 (05-review-report) │
                     │     🔴 卡点: 审查通过               │
                     └────────────────┬──────────────────┘
                                      ▼
                     ┌───────────────────────────────────┐
                     │  6. Orchestrator 合并部署           │
                     │     MR + 部署报告 (06-deploy-report)│
                     │     🔴 卡点: 部署确认               │
                     └───────────────────────────────────┘
```

## 架构

```
飞书 (通知/审批/云文档)
    │
    ▼
人工卡点控制台
    │
    ▼
AI-Flow 编排层
├── Architect  ── 需求分析 + 架构设计
├── Designer   ── 技术方案 + 任务拆解
├── Coder      ── TDD 编码实现
├── Tester     ── Playwright E2E 测试
├── Reviewer   ── 四维代码审查
└── Orchestrator── MR + 部署
    │
    ▼
GitLab + DevOps 云平台
```

## 输出规范

所有 Agent 产物存放在迭代目录：

```
.ai-flow/output/iterations/<YYYYMMDD>-<序号>-<功能名>/
├── 01-requirements.md    ← Architect
├── 02-design.md          ← Designer
├── 04-test-report.md     ← Tester
├── 05-review-report.md   ← Reviewer
└── 06-deploy-report.md   ← Orchestrator
```

## 配置

```json
// .claude/settings.json
{
  "ai-flow": {
    "feishu": {
      "chatId": "<飞书群聊 ID>",
      "docFolderId": "<飞书云文档目录 ID>"
    }
  }
}
```

## 开发

```bash
# 安装依赖
npm install

# 运行测试
npm test
```

## 许可证

[MIT](./LICENSE)
