# skills/team-agent-orchestrator/SKILL.md

# 多 Agent 编排

## 概述

管理 AI-Flow 工作流中的多 Agent 编排，统一终端 / Claude Code / 飞书 三种触发方式，支持串行执行、失败回退、人工卡点和并行调度（P3+）。

## 触发方式

三个端使用同一个命令 `/aiflow`，记忆零成本。

| 端 | 命令 | 说明 |
|---|---|---|
| 终端 | `npx aiflow "用户登录"` | npm 全局命令 |
| Claude Code | `/aiflow 用户登录` | slash command |
| 飞书 | `/aiflow 用户登录` | bot command |

## 工作流引擎（P0-P2 MVP）

基于 YAML 工作流定义 + workflow-runner skill 实现串行编排。

### 执行流程

```
1. 解析 YAML → 提取 stage 列表
2. 对每个 stage:
   a. 加载对应 Agent 定义（agents/*.md）
   b. 加载所需 Skills
   c. 设置输入上下文（上阶段输出）
   d. 调度 Agent 执行
   e. 检查 human_gate → 如有则等待审批
   f. 检查 on_failure → 如失败则回退
3. 所有 stage 完成 → 输出结果
```

### `/aiflow` Command 触发示例

```
用户输入: /aiflow 用户登录

Claude Code 执行流程:
1. 加载 commands/aiflow.md
2. 读取工作流 YAML (workflows/feature-development.yaml)
3. 加载编排 skill (team-agent-orchestrator)
4. 逐 stage 执行:
   - Stage 1: Architect (需求分析) → 结构化需求文档 → 🔴 卡点
   - 用户: approve
   - Stage 2: Designer (架构设计) → 设计文档+任务列表 → 🔴 卡点
   - 用户: approve
   - Stage 3: Coder (编码实现) → 代码+单元测试 → ⚡ 自动继续
   - Stage 4: Tester (E2E 测试) → 测试报告 → ⚡ 自动继续
   - Stage 5: Reviewer (代码审查) → 审查报告 → 🔴 卡点
   - 用户: approve
   - Stage 6: Orchestrator (合并部署) → MR+部署 → 🔴 卡点
   - 用户: approve → 完成
```

### 终端触发示例

```bash
npx aiflow "用户登录"

[ai-flow] === AI-Flow Run ===
[ai-flow] Feature: 用户登录
[ai-flow] Workflow: 功能开发工作流 (v1.0)
[ai-flow] Stages: 6
[ai-flow]   🔴 需求分析 [architect]
[ai-flow]   🔴 架构设计 [designer]
[ai-flow]   ⚡ 编码实现 [coder]
[ai-flow]   ⚡ E2E 测试 [tester]
[ai-flow]   🔴 代码审查 [reviewer]
[ai-flow]   🔴 合并部署 [orchestrator]
[ai-flow] Dispatching to workflow-runner...
[ai-flow] Starting Stage 1: 需求分析
```

### Agent 调度方式（P0-P2）

使用 Claude Code 的 Agent tool 调度子代理：

```
主会话 (Claude Code)
  ├── dispatch architect agent (brainstorming)
  │   └── 输出: 结构化需求文档
  ├── dispatch designer agent (writing-plans)
  │   └── 输出: 架构设计 + 任务列表
  ├── dispatch coder agent (TDD)
  │   └── 输出: 代码 + 单元测试
  ├── dispatch tester agent (E2E)
  │   └── 输出: Playwright 测试报告
  ├── dispatch reviewer agent (code review)
  │   └── 输出: 审查报告
  └── dispatch orchestrator agent (merge & deploy)
      └── 输出: MR + 部署结果
```

### 状态传递

```
stage[i].output → stage[i+1].input
  ├── 需求分析输出 → 架构设计输入
  ├── 架构设计输出 → 编码实现输入
  ├── 编码输出 → E2E 测试输入
  ├── 测试输出 → 代码审查输入
  └── 审查输出 → 部署输入
```

### 失败回退策略

```yaml
# 内置回退规则
on_failure:
  route_to: coder      # 回退到 Coder
  max_retries: 3        # 最大重试次数
  notify: feishu        # 重试时通知飞书

# 重试逻辑:
# 1. Tester 失败 → 回退 Coder 修复 → 重新测试
# 2. 最多重试 3 次
# 3. 3 次后仍失败 → 通知飞书 + 暂停工作流
```

### 人工卡点实现

```
卡点等待逻辑（P0-P2）:

1. Agent 完成当前 stage
2. 检查是否有 human_gate
3. 如有:
   - Claude Code: 对话中等待用户回复 approve/reject
   - 终端: 等待用户输入 approve/reject
   - 飞书: 推送审批卡片，等待用户点击按钮
4. approve → 继续下一阶段
5. reject → 终止工作流
6. modify → 回退当前 Agent 重新执行
```

## 工作流引擎演进路线

### P0-P2: YAML 工作流（当前）
- 串行执行
- 失败回退
- 人工卡点
- 基于 Claude Code Agent tool

### P3+: 独立编排引擎
- 并行 Agent 调度
- 状态持久化（SQLite/Redis）
- 断点续跑
- 重试策略可配置
- Webhook 驱动的卡点审批

## 工作流 YAML 参考

完整的工作流 YAML 定义见 `workflows/feature-development.yaml`。

关键配置项：

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `agent` | string | Agent 角色名称 |
| `model` | string | 使用的模型（sonnet/haiku） |
| `skills` | list | 该阶段需要的 skills 列表 |
| `human_gate` | object | 人工卡点配置（title/notify/actions） |
| `auto_continue` | bool | 无卡点自动继续 |
| `on_failure` | object | 失败回退配置（route_to/max_retries） |
