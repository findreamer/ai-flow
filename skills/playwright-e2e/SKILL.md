# skills/playwright-e2e/SKILL.md

# Playwright E2E 测试规范

## 概述
指导 Tester Agent 编写和执行 Playwright E2E 测试，覆盖核心用户流程。

## 触发条件
- Tester Agent 启动时
- 编码实现阶段完成后

## 测试原则

1. **基于验收标准** — 每个 User Story 的 Given/When/Then 至少对应 1 个 E2E 测试
2. **黄金路径优先** — 先覆盖 Happy Path，再覆盖 Edge Case
3. **独立可重复** — 每个测试独立运行，不依赖其他测试状态
4. **稳定可靠** — 使用 `waitForURL` / `waitForSelector` 替代 `sleep`

## 测试结构

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature: 用户登录', () => {
  test('黄金路径：正确凭据登录成功', async ({ page }) => {
    // Given - 导航到登录页
    await page.goto('/login');
    await expect(page).toHaveURL('/login');

    // When - 输入凭据并提交
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'correct-password');
    await page.click('#login-button');

    // Then - 验证跳转到主页
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('边界：错误凭据显示错误消息', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'wrong-password');
    await page.click('#login-button');

    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page).toHaveURL('/login'); // 未跳转
  });
});
```

## 定位策略

| 优先级 | 策略 | 示例 |
|--------|------|------|
| 1 | role | `page.getByRole('button', { name: 'Submit' })` |
| 2 | text | `page.getByText('Welcome')` |
| 3 | label | `page.getByLabel('Email')` |
| 4 | test ID | `page.getByTestId('login-button')` |
| 5 | CSS | `page.locator('#submit-btn')` (最后选择) |

## 测试覆盖范围

```
┌─────────────────────────────────────┐
│  E2E 测试覆盖（按优先级）             │
├─────────────────────────────────────┤
│  P0: 核心用户流程 (必须)              │
│    - 登录/注册/登出                  │
│    - 核心业务操作                    │
│    - 数据持久化验证                   │
│  P1: 边界条件 (建议)                  │
│    - 表单验证                        │
│    - 错误处理                        │
│    - 空状态                          │
│  P2: 性能和可访问性 (可选)             │
│    - 加载时间                        │
│    - 响应式布局                      │
└─────────────────────────────────────┘
```

## 失败处理

- 测试失败时自动截图 + 录制 trace
- 截图保存到 `test-results/` 目录
- 输出格式化的测试报告

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-report' }],
  ],
});
```
