---
name: code-formatter
description: "自动格式化代码，应用项目配置的代码风格规则，支持多种语言和格式化工具集成。"
---

# 代码格式化助手

自动检测并应用项目的代码格式化规则，确保代码风格一致性。

## 触发条件

- 新代码文件创建后
- 现有代码修改完成后
- 用户明确要求"格式化代码"
- Git 提交前（配合 hooks 使用）

## 功能特性

### 1. 自动检测格式化工具

扫描项目根目录的配置文件：

| 语言/工具 | 配置文件 | 执行命令 |
|----------|---------|---------|
| JavaScript/TypeScript | `.prettierrc`, `prettier.config.js` | `prettier --write` |
| JavaScript/TypeScript | `.eslintrc*` | `eslint --fix` |
| Python | `pyproject.toml`, `.ruff.toml` | `ruff format` |
| Python | `.black` | `black` |
| Go | `.goimports` | `go fmt` |
| Java | `pom.xml` (Spotless) | `mvn spotless:apply` |

### 2. 智能格式化流程

按以下顺序执行：

1. **检测可用工具** - 检查配置文件是否存在
2. **选择最佳工具** - 优先使用项目配置的工具
3. **执行格式化** - 使用 Run Command 调用格式化工具
4. **验证结果** - 检查是否有变化
5. **报告差异** - 显示格式化前后的对比

### 3. 无配置时的默认规则

如果项目没有格式化配置，按以下默认处理：

- JavaScript/TypeScript: 推荐使用 Prettier 标准配置
- Python: 使用 black 默认风格
- Go: 使用 go fmt
- Java: 使用 Google Java Format

## 使用示例

### 单个文件格式化

```
请帮我格式化 src/utils.js 文件
```

### 整个项目格式化

```
运行代码格式化，整个项目
```

### 特定文件类型格式化

```
格式化所有 .tsx 文件
```

## 最佳实践

- 代码审查前确保所有代码已格式化
- 每个 PR 都应有格式化步骤
- 在 CI/CD 流程中加入格式检查（--check 模式）
- 配置 IDE 保存时自动格式化
