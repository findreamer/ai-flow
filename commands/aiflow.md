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
