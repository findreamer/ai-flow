---
name: workflow-runner
description: "AI-Flow 工作流执行器——运行 feature-development.yaml 或其他工作流定义，驱动全流程开发。自动检测已安装的工作流文件，支持人工卡点、状态传递和失败重试。"
---

# AI-Flow 工作流执行器

专门用于执行 AI-Flow 的 YAML 工作流定义，提供完整的多角色协作开发流程支持。

## 触发条件

- 用户执行 `npx aiflow "feature-name"` 或 `/aiflow` 命令
- 用户明确要求"运行工作流"或"开始功能开发"
- 当前项目目录下存在 `.claude/workflows/feature-development.yaml` 或类似文件

## 工作流解析

使用 Read 工具读取工作流 YAML 文件，AI-Flow 工作流格式：

```yaml
name: 功能开发工作流
version: "1.0"
description: "完整的功能开发流程"

stages:
  - name: 需求分析
    agent: architect
    model: sonnet
    skills: [brainstorming, writing-plans]
    input: "初始需求：{{feature-name}}"
    output: "需求文档"
    human_gate:
      title: "需求确认"
      actions: [approve, reject, revise]
    auto_continue: false

  - name: 架构设计
    agent: designer
    skills: [writing-plans, subagent-driven-development]
    input: "需求分析输出"
    output: "架构文档+任务列表"
    auto_continue: false
```

## 执行流程

按以下步骤执行工作流：

### 1. 初始化

- 读取并验证工作流 YAML
- 显示完整的执行计划给用户确认
- 准备工作区

### 2. 逐阶段执行

对每个 stage：

#### a. 加载 Agent 配置

从 `.claude/agents/{agent-name}.md` 读取 agent 定义

#### b. 加载所需 Skills

根据 `stage.skills` 加载对应技能

#### c. 设置上下文

将上一阶段的 `output` 作为当前阶段的 `input`

#### d. 执行任务

以该 Agent 角色完成阶段任务：
- 清晰标明当前阶段和 Agent 角色
- 使用 Agent 的专业知识和沟通风格
- 完整记录输出结果

#### e. 处理 Human Gate

如果该阶段有 `human_gate`：
- 显示卡点标题和说明
- 提供 `approve` / `reject` / `revise` 选项
- 等待用户确认才继续

#### f. 自动继续

如果 `auto_continue: true`，直接进入下一阶段

### 3. 失败处理

如果 stage 有 `on_failure` 配置：
- 失败时自动重试最多 `max_retries` 次
- 或按 `route_to` 转发给指定 Agent 修复
- 记录失败原因

### 4. 完成总结

所有 stages 完成后：
- 生成完整的项目总结
- 列出所有输出文件
- 提供后续操作建议

## 关键特性

### 状态传递

```
stage[i].output → stage[i+1].input
```

确保工作流上下文完整传递

### 人工卡点

在关键节点（需求确认、方案审批、代码审查、部署确认）暂停，等待用户确认

### 可视化进度

显示：
- 当前阶段 / 总阶段数
- 已完成 / 进行中 / 待处理 状态
- 卡点位置提示

## 快速开始模式

如果用户直接说"帮我开发 X 功能"，但还没有 init：

1. 先建议用户运行 `npx aiflow init` 初始化
2. 或快速生成临时工作流进行演示
3. 引导用户完成完整的 AI-Flow 设置

## CLI 集成

当用户在终端执行 `npx aiflow "feature"` 后切换到 Claude Code 时：

1. 主动接手继续执行工作流
2. 从终端输出中获取 feature name 和当前阶段
3. 无缝衔接继续执行
