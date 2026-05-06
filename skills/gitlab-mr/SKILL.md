# skills/gitlab-mr/SKILL.md

# GitLab MR 工作流

## 概述

通过 GitLab CLI (`glab`) 管理功能分支和 Merge Request，支持 GitFlow/GitHub Flow/Trunk-Based 工作流。MR 创建后自动推送通知到飞书群，触发 Code Review。

**前置条件**: 项目需安装 `glab`（GitLab 官方 CLI）并完成认证。

## 安装与配置

```bash
# 安装 glab
brew install glab  # macOS
# 或
npm install -g @gitlab/cli

# 认证（支持自托管 GitLab）
glab auth login --hostname gitlab.yourcompany.com

# 验证
glab auth status
```

## Git 工作流配置

AI-Flow 从项目配置中读取 Git 工作流类型和分支名：

```json
// .claude/settings.json
{
  "ai-flow": {
    "git": {
      "workflow": "gitflow",
      "mainBranch": "main",
      "developBranch": "develop",
      "aiFlowBranch": "develop-ai-flow"
    }
  }
}
```

| 分支 | 用途 | 说明 |
|------|------|------|
| `main` | 生产环境 | 上线代码 |
| `develop` | 人工开发 | 团队日常开发分支 |
| `develop-ai-flow` | AI 生成代码 | AI-Flow 专属集成分支，MR 目标 |
| `feature/ai-<name>` | AI 功能分支 | 每次 AI-Flow 工作流创建的临时分支 |

### 分支隔离设计

```
main (生产)
  ↑
develop (人工开发)    develop-ai-flow (AI 集成)
         ↑                       ↑
  feature/* (人工)    feature/ai-<name> (AI 生成)
```

- **人工开发**: `feature/*` → MR → `develop`
- **AI 生成**: `feature/ai-<name>` → MR → `develop-ai-flow`
- **定期同步**: `develop-ai-flow` 审查通过后 → MR → `develop`（团队决定时机）

这样 AI 生成的代码先合到 `develop-ai-flow`，团队审核确认后手动合入 `develop`，不干扰存量项目的正常开发流。

## 工作流程

### 1. 创建 AI 功能分支

```bash
# 从 develop-ai-flow 创建 AI 功能分支（如果不存在则从 main 创建）
git fetch origin
git checkout -b develop-ai-flow origin/develop-ai-flow 2>/dev/null || \
  git checkout -b develop-ai-flow origin/main

git pull origin develop-ai-flow 2>/dev/null || true

# 创建功能分支
git checkout -b feature/ai-<feature-name> develop-ai-flow
```

### 2. 编码完成后提交

```bash
# 遵循 conventional commits，标记 AI 生成
git add .
git commit -m "feat: implement user authentication

Co-Authored-By: AI-Flow <ai-flow@local>

- Add login API and component
- Add unit tests and E2E tests"
```

### 3. 推送并创建 MR

```bash
# 推送功能分支
git push -u origin feature/ai-<feature-name>

# 创建 MR（目标: develop-ai-flow）
glab mr create \
  --source-branch feature/ai-<feature-name> \
  --target-branch develop-ai-flow \
  --title "feat(AI): implement user authentication" \
  --description-file .tmp/mr-description.md \
  --no-editor

# 获取 MR URL 和 IID
MR_URL=$(glab mr list --source-branch feature/ai-<feature-name> --json | jq -r '.[0].web_url')
MR_IID=$(glab mr list --source-branch feature/ai-<feature-name> --json | jq -r '.[0].iid')
```

### 4. MR Description 模板

```markdown
## AI-Flow 生成

此 MR 由 AI-Flow 自动生成，请仔细审查。

## 概述
实现用户登录功能

## 变更清单
- [x] 新增功能
- [ ] 修复 Bug

## 测试报告
- 单元测试: 12 passed / 0 failed
- E2E 测试: 3 passed / 0 failed (Playwright)
- 审查报告: 0 CRITICAL, 0 HIGH, 1 MEDIUM

## 审查要点
1. <AI 审查 Agent 的重点审查项>

## 相关需求
- 飞书需求文档: <URL>
```

### 5. 推送 Code Review 通知到飞书

```bash
# MR 创建后，发送通知到飞书群
lark-cli im +messages-send \
  --chat-id "$FEISHU_CHAT_ID" \
  --text "
🔍 AI-Flow: MR 已创建，请 Code Review

功能: <feature-name>
MR: <$MR_URL|$MR_IID>
目标分支: develop-ai-flow
变更文件: N 个
单元测试: N passed / N failed
E2E 测试: N passed / N failed

请在飞书查看或通过终端执行: approve / reject
"
```

### 6. 合并 MR

```bash
# 审查通过后合并到 develop-ai-flow
glab mr merge <mr-iid> \
  --when-pipeline-succeeds \
  --remove-source-branch
```

### 7. 定期同步到 develop

团队确认后，将 `develop-ai-flow` 合入 `develop`：

```bash
# 创建同步 MR（需人工触发或审批通过）
glab mr create \
  --source-branch develop-ai-flow \
  --target-branch develop \
  --title "chore(AI): sync AI-generated code to develop" \
  --description "AI-Flow 生成的代码审查通过，同步到开发分支"
```

## 环境变量

```bash
# GitLab 主机
export GITLAB_HOST="gitlab.yourcompany.com"

# 飞书群聊 ID（MR 通知推送）
export FEISHU_CHAT_ID="oc_xxx"
```

## 安全注意

- glab 凭证存储在 OS 原生密钥链中
- MR description 中不包含敏感信息
- 功能分支合并后自动删除
