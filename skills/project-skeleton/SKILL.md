---
name: project-skeleton
description: "快速创建项目骨架，根据技术栈自动生成标准目录结构、配置文件、基础代码模板。"
---

# 项目脚手架生成器

根据技术栈自动创建符合最佳实践的项目骨架结构。

## 触发条件

- 用户说"初始化新项目"、"创建项目骨架"
- 在空目录中执行开发任务
- AI-Flow init 完成后需要进一步项目结构

## 支持的技术栈

### 前端项目

| 技术栈 | 项目类型 |
|--------|---------|
| React + TypeScript | SPA 应用 |
| Next.js | Full-stack React |
| Vue.js | SPA 应用 |
| Vite | 快速启动项目 |

### 后端项目

| 技术栈 | 项目类型 |
|--------|---------|
| Node.js + Express | REST API |
| Python + FastAPI | 高性能 API |
| Python + Django | 全栈 Web |
| Go + Gin | 微服务 |
| Java + Spring Boot | 企业应用 |

## 标准目录结构

### React + TypeScript

```
src/
├── components/
│   ├── common/
│   └── features/
├── hooks/
├── services/
├── utils/
├── types/
├── App.tsx
└── main.tsx
tests/
├── unit/
└── e2e/
```

### Python + FastAPI

```
app/
├── api/
│   ├── v1/
│   └── deps.py
├── core/
├── models/
├── schemas/
├── services/
└── main.py
tests/
├── api/
└── unit/
```

### Node.js + Express

```
src/
├── controllers/
├── models/
├── routes/
├── middleware/
├── services/
├── utils/
├── config/
└── index.js
tests/
```

## 配置文件生成

自动创建标准配置：

- `package.json` - 依赖管理（Node.js）
- `pyproject.toml` - Python 配置
- `tsconfig.json` - TypeScript 配置
- `.gitignore` - Git 忽略规则
- `.env.example` - 环境变量示例
- `README.md` - 项目文档
- Docker 相关配置（可选）

## 使用示例

```
帮我创建一个 React + TypeScript 项目骨架
```

```
初始化 FastAPI 后端项目结构
```

## 集成 AI-Flow

脚手架完成后，自动：
- 运行 `npx aiflow init` 初始化 AI-Flow
- 安装默认的 agents 和 skills
- 配置项目特定的工作流
