# skills/devops-trigger/SKILL.md

# DevOps 云平台触发

## 概述

在 AI-Flow 工作流的部署确认阶段，触发企业内部 DevOps 云平台的部署流程。

## 触发条件
- 部署确认卡点通过后（人工 approve）
- Orchestrator Agent 执行部署

## 触发方式

### 方式一：Pipeline API（推荐）

```bash
# 触发 DevOps 平台流水线
curl -s --header "PRIVATE-TOKEN: $DEVOPS_TOKEN" \
  "https://<devops-host>/api/v4/projects/<project-id>/pipelines" \
  --data '{
    "ref": "develop-ai-flow",
    "variables": {
      "DEPLOY_ENV": "staging",
      "SOURCE_BRANCH": "develop-ai-flow",
      "AI_FLOW_TRIGGER": "true"
    }
  }'
```

### 方式二：Webhook

```bash
# 发送 Webhook 事件通知 DevOps 平台
curl -s -X POST "<devops-webhook-url>" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "deploy",
    "branch": "develop-ai-flow",
    "environment": "staging",
    "triggered_by": "AI-Flow",
    "mr_iid": "<mr-iid>"
  }'
```

### 方式三：Git Tag（基于 Tag 触发 CI/CD）

```bash
# 创建部署 Tag，触发 CI/CD pipeline
git tag -a deploy-<feature-name>-<timestamp> -m "AI-Flow: deploy <feature-name>"
git push origin deploy-<feature-name>-<timestamp>
```

## 环境变量

```bash
# DevOps 平台 API Token
export DEVOPS_TOKEN="xxxx"

# DevOps 平台 API 地址
export DEVOPS_API_URL="https://devops.yourcompany.com/api/v4"

# 项目 ID
export DEVOPS_PROJECT_ID="xxx"
```

## 部署后通知

部署触发后推送结果到飞书：

```bash
# 等待部署完成（轮询或 Webhook 回调）
# 推送结果到飞书群
lark-cli im +messages-send \
  --chat-id "$FEISHU_CHAT_ID" \
  --text "
✅ AI-Flow 部署完成

功能: <feature-name>
环境: staging
分支: develop-ai-flow
部署时间: <timestamp>
状态: success

请验证功能后确认上线。
"
```

## 设计说明

由于各企业 DevOps 平台 API 不同，此 skill 提供通用触发方式。企业可根据实际平台封装具体的触发脚本，放在 `.ai-flow/deploy.sh` 中：

```bash
# .ai-flow/deploy.sh（企业自定义）
#!/bin/bash
# $1: environment (staging/production)
# $2: branch
# $3: feature-name
set -euo pipefail

ENV=$1
BRANCH=$2
FEATURE=$3

# 调用企业 DevOps 平台 API
curl -s --header "Authorization: Bearer $DEVOPS_TOKEN" \
  "$DEVOPS_API_URL/projects/$DEVOPS_PROJECT_ID/deploy" \
  --data "{
    \"environment\": \"$ENV\",
    \"branch\": \"$BRANCH\",
    \"feature\": \"$FEATURE\",
    \"triggered_by\": \"AI-Flow\"
  }"

echo "Deploy triggered: $FEATURE to $ENV ($BRANCH)"
```
