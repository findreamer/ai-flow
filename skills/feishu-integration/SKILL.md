# skills/feishu-integration/SKILL.md

# 飞书集成 (基于 lark-cli)

## 概述

通过飞书官方 CLI (`lark-cli`) 实现 AI-Flow 工作流中的飞书交互能力：需求拉取、通知推送、审批交互。

**前置条件**: 项目需安装 `@larksuite/cli` 并完成认证配置。

## 安装与配置

```bash
# 安装飞书 CLI
npm install -g @larksuite/cli

# 安装飞书 CLI SKILL
npx skills add larksuite/cli -y -g

# 配置应用凭证（交互式引导）
lark-cli config init

# 登录授权（需浏览器配合）
lark-cli auth login --recommend

# 验证认证状态
lark-cli auth status
```

**AI-Flow 需要的权限范围**:

| 业务域 | 所需 scope | 用途 |
|--------|-----------|------|
| 即时通讯 | `im:message:send_v2`, `im:message:read` | 推送通知、审批卡片 |
| 云文档 | `docx:document:read`, `docx:document:write` | 拉取需求、写入设计文档 |
| 审批 | `approval:task:read`, `approval:task:write` | 查询/处理审批任务 |
| 任务 | `task:task:read`, `task:task:write` | 管理 AI-Flow 生成的任务 |
| 多维表格 | `bitable:app:read` | 从多维表格拉取需求列表 |

## 能力

### 1. 需求拉取

#### 从飞书文档拉取需求

```bash
# 拉取飞书文档内容（v2 API）
lark-cli docs +fetch --api-version v2 --doc "https://xxx.feishu.cn/docx/xxxxx"

# 导出为 Markdown 格式
lark-cli docs +fetch --api-version v2 --doc "https://xxx.feishu.cn/docx/xxxxx" --export
```

AI-Flow 工作流中的用法：
```bash
# Architect Agent 启动时，从飞书文档 URL 拉取需求
lark-cli docs +fetch --api-version v2 --doc "<飞书需求文档URL>" --format json
```

#### 从多维表格拉取需求列表

```bash
# 列出多维表格中的记录
lark-cli base tables records list --params '{"app_token":"xxx","table_id":"xxx"}' --format table
```

#### 从飞书任务拉取需求

```bash
# 获取我的任务列表
lark-cli task +get-my-tasks --format table

# 搜索相关任务
lark-cli task +search --query "需求关键词" --format json
```

### 2. 通知推送

#### 发送文本通知到群聊

```bash
# 发送简单文本消息
lark-cli im +messages-send --chat-id "oc_xxx" --text "AI-Flow: 需求分析完成，等待审批"

# 发送 Markdown 格式消息
lark-cli im +messages-send --chat-id "oc_xxx" \
  --msg-type "interactive" \
  --content '{"card":{...}}'
```

#### AI-Flow 通知模板

**需求分析完成通知**:
```bash
lark-cli im +messages-send --chat-id "$FEISHU_CHAT_ID" --text "
✅ AI-Flow 需求分析完成

功能: <feature-name>
User Stories: <N> 条
验收标准: <N> 条 Given/When/Then

请在飞书审批或终端执行: approve / reject
"
```

**编码完成通知**:
```bash
lark-cli im +messages-send --chat-id "$FEISHU_CHAT_ID" --text "
💻 AI-Flow 编码完成

文件变更: <N> 个
单元测试: <N> passed / <N> failed
代码提交: <commit-hash>

进入下一阶段: E2E 测试
"
```

**审查报告通知**:
```bash
lark-cli im +messages-send --chat-id "$FEISHU_CHAT_ID" --text "
🔍 AI-Flow 代码审查完成

CRITICAL: <N>
HIGH: <N>
MEDIUM: <N>
LOW: <N>

请在飞书审批或终端执行: approve / reject
"
```

### 3. 审批交互

#### 查询审批任务

```bash
# 查询待审批任务
lark-cli approval tasks query --params '{"user_id_type":"open_id"}' --format table

# 审批通过
lark-cli approval tasks approve --params '{"task_id":"xxx","approval_comment":"同意"}'

# 审批驳回
lark-cli approval tasks reject --params '{"task_id":"xxx","approval_comment":"原因"}'
```

#### AI-Flow 审批流程

```
1. AI-Flow 通过 im +messages-send 发送审批通知到飞书群
2. 用户在飞书回复消息或终端输入 approve/reject
3. AI-Flow 解析审批结果
4. 审批通过 → 继续工作流
5. 审批驳回 → 终止或回退
```

### 4. 任务管理

AI-Flow 可将 Designer 拆解的任务同步到飞书任务：

```bash
# 创建任务
lark-cli task +create --summary "实现用户登录 API" --due "2026-05-07T18:00:00+08:00"

# 更新任务状态
lark-cli task +update --guid "xxx" --status "completed"

# 为任务添加评论
lark-cli task +comment --guid "xxx" --content "编码完成，commit: abc123"
```

### 5. 日程集成

```bash
# 查看今日日程
lark-cli calendar +agenda

# 检查忙闲（避免打扰）
lark-cli calendar freebusy list --params '{"time_min":"...","time_max":"..."}'
```

### 6. 通讯录

```bash
# 搜索用户（用于任务分配）
lark-cli contact users search --params '{"query":"张三"}'
```

## 环境变量

```bash
# 飞书 CLI 配置目录（可选，默认在 ~/.config/lark-cli）
export LARKSUITE_CLI_CONFIG_DIR=~/.config/lark-cli

# AI-Flow 飞书群聊 ID（用于通知推送）
export FEISHU_CHAT_ID="oc_xxx"
```

## 工作流集成点

| 阶段 | 飞书操作 | CLI 命令 |
|------|---------|----------|
| 需求分析 | 拉取飞书文档需求 | `docs +fetch` |
| 需求确认 | 推送审批通知 | `im +messages-send` |
| 方案审批 | 推送审批通知 + 接收审批 | `im +messages-send` + `approval tasks query/approve/reject` |
| 编码完成 | 推送进度通知 | `im +messages-send` |
| 代码审查 | 推送审查报告 + 接收审批 | `im +messages-send` + `approval tasks query/approve/reject` |
| 部署确认 | 推送部署通知 + 接收审批 | `im +messages-send` + `approval tasks query/approve/reject` |
| 全程 | 任务状态同步 | `task +create/update/comment` |

## 安全注意

- 飞书 CLI 凭证存储在 OS 原生密钥链中，不泄露到环境变量
- AI Agent 调用飞书 API 前应先 `auth status` 确认权限
- 敏感操作（审批通过/驳回）建议先用 `--dry-run` 预览
