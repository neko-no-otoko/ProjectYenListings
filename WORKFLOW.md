# Git Workflow for Akiya Japan App

This document defines the standard Git workflow for continuous development of the Akiya Japan application.

## Branch Strategy

```
main (production-ready)
  │
  ├── feature/bodik-improvements
  ├── feature/new-data-source-x
  ├── feature/ui-enhancements
  └── hotfix/critical-bug
```

### Branch Types

| Branch | Purpose | Naming Convention |
|--------|---------|-------------------|
| `main` | Production-ready code | - |
| `feature/*` | New features, data sources | `feature/descriptive-name` |
| `hotfix/*` | Urgent fixes to main | `hotfix/issue-description` |

## Daily Development Workflow

### 1. Start of Work Session

```bash
cd ~/.openclaw/workspace/akiya-app

# Pull latest changes
git checkout main
git pull origin main

# Check for uncommitted changes
git status
```

### 2. Create Feature Branch

```bash
# Create and switch to new feature branch
git checkout -b feature/descriptive-name

# Example:
git checkout -b feature/add-reinfolib-connector
```

### 3. Make Changes

Edit files as needed. Follow the project structure:
- Connectors: `server/lib/connectors/`
- Data ingestion: `scripts/`
- Frontend: `client/src/`

### 4. Commit Changes

```bash
# Stage files
git add <files>

# Commit with descriptive message
git commit -m "type: description"

# Commit message format:
# feat: add new feature
# fix: fix bug
# docs: documentation changes
# refactor: code refactoring
# test: add tests
```

### 5. Push and Create PR

```bash
# Push branch to remote
git push -u origin feature/descriptive-name

# Create pull request (or push directly if authorized)
gh pr create --title "feat: description" --body "Details..."
```

### 6. Merge and Cleanup

```bash
# After PR is approved/merged
git checkout main
git pull origin main

# Delete local branch
git branch -d feature/descriptive-name

# Delete remote branch
git push origin --delete feature/descriptive-name
```

## Adding New Data Sources

When integrating a new data source:

1. **Create feature branch:**
   ```bash
   git checkout -b feature/add-source-name
   ```

2. **Implement connector:**
   - Create `server/lib/connectors/<source>/`
   - Implement `Connector` interface
   - Add mapper for data normalization

3. **Update configuration:**
   - Add environment variables to `.env.example`
   - Update `DATA_SOURCES_GUIDE.md`

4. **Test locally:**
   ```bash
   npm run dev
   # Test the connector endpoint
   ```

5. **Commit and push:**
   ```bash
   git add .
   git commit -m "feat: add <source> connector"
   git push -u origin feature/add-source-name
   ```

6. **Create PR for review** (if required)

## Git Commands Reference

```bash
# Check status
git status

# View commit history
git log --oneline -10

# View changes
git diff

# Stash changes temporarily
git stash
git stash pop

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all changes
git checkout -- .
```

## Environment Setup

```bash
# Repository location
REPO_PATH=~/.openclaw/workspace/akiya-app

# Git configuration
git config --local user.name "Sora"
git config --local user.email "sora@openclaw.local"
```

## Notes for AI Development

- Always pull latest changes before starting work
- Create feature branches for any non-trivial changes
- Write descriptive commit messages
- Push changes regularly to avoid losing work
- Document new data sources in DATA_SOURCES_GUIDE.md
- Test connectors locally before pushing

## Troubleshooting

### Merge Conflicts

```bash
# Pull with rebase
git pull --rebase origin main

# Resolve conflicts, then:
git add .
git rebase --continue
```

### Authentication Issues

If push fails due to auth:
- Ensure git credentials are configured
- Use HTTPS with cached credentials
- Or configure SSH keys for GitHub

---
*Generated: March 17, 2026*
