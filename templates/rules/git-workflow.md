# Git Workflow

## Branch Naming

- Feature branches: `feature/<feature-name>` or `develop-ai-flow` (AI-generated)
- Bug fix: `fix/<bug-id>`
- Release: `release/<version>`
- Hotfix: `hotfix/<issue>`

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]
```

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `refactor` | Code restructuring |
| `test` | Tests |
| `chore` | Tooling/config |

## AI-Generated Code

- All AI work happens on `develop-ai-flow` branch
- Never commit directly to `main` or `develop`
- Merge via MR after code review approval

## Merge Rules

- No force-push to shared branches
- Squash merge for feature branches
- Require at least 1 approval before merge
