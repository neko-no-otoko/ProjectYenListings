# GitHub Setup Guide

Complete guide for GitHub integration with the Akiya Japan app repository.

## Repository Information

- **Repository:** `neko-no-otoko/ProjectYenListings`
- **Local Path:** `~/.openclaw/workspace/akiya-app`
- **Remote URL:** `https://github.com/neko-no-otoko/ProjectYenListings.git`

## Setup Status

| Component | Status | Details |
|-----------|--------|---------|
| Git CLI | ✅ Installed | Version 2.48.1 |
| GitHub CLI (gh) | ✅ Installed | Version 2.88.1 |
| Repository | ✅ Cloned | At `~/.openclaw/workspace/akiya-app` |
| Git Config | ✅ Configured | User: Sora |
| Remote | ✅ Set | origin → GitHub |

## Git Configuration

### Local Repository Config

```bash
cd ~/.openclaw/workspace/akiya-app

# User identity
git config --local user.name "Sora"
git config --local user.email "sora@openclaw.local"

# Credential caching
git config --local credential.helper cache

# Default branch
git config --local init.defaultBranch main
```

### Current Configuration

```bash
# View all config
git config --local --list

# Output:
# user.name=Sora
# user.email=sora@openclaw.local
# remote.origin.url=https://github.com/neko-no-otoko/ProjectYenListings.git
# remote.origin.fetch=+refs/heads/*:refs/remotes/origin/*
# branch.main.remote=origin
# branch.main.merge=refs/heads/main
```

## Authentication Methods

### Option 1: HTTPS with Personal Access Token (Recommended for automation)

1. Generate PAT at https://github.com/settings/tokens
2. Grant permissions: `repo`, `workflow`
3. Configure git to use token:
   ```bash
   git remote set-url origin https://<token>@github.com/neko-no-otoko/ProjectYenListings.git
   ```

### Option 2: SSH Key (Recommended for interactive use)

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "sora@openclaw.local"

# Add to GitHub
gh ssh-key add ~/.ssh/id_ed25519.pub --title "OpenClaw Sora"

# Update remote URL
git remote set-url origin git@github.com:neko-no-otoko/ProjectYenListings.git
```

### Option 3: GitHub CLI Authentication

```bash
# Interactive login
gh auth login

# Or with token
gh auth login --with-token < token.txt
```

## Branch Protection (Recommended)

Configure in GitHub Repository Settings:

1. Go to Settings → Branches
2. Add rule for `main`:
   - ✅ Require pull request reviews
   - ✅ Require status checks
   - ✅ Restrict pushes to specific people

## Repository Structure

```
akiya-app/
├── .git/                   # Git repository data
├── .github/                # GitHub Actions/workflows
├── client/                 # React frontend
├── server/                 # Express backend
│   └── lib/
│       └── connectors/     # Data source connectors
├── scripts/                # Python ingestion scripts
├── shared/                 # Shared types/schemas
├── data/                   # Local data storage
├── README.md               # Project overview
├── WORKFLOW.md             # Git workflow guide
├── DATA_SOURCES_GUIDE.md   # Data source documentation
└── GITHUB_SETUP.md         # This file
```

## Quick Start Commands

```bash
# Navigate to repository
cd ~/.openclaw/workspace/akiya-app

# Check repository status
git status

# View recent commits
git log --oneline -5

# View branches
git branch -a

# Fetch latest from remote
git fetch origin

# Pull latest changes
git pull origin main
```

## GitHub CLI Commands

```bash
# View repository
gh repo view neko-no-otoko/ProjectYenListings

# List issues
gh issue list

# Create issue
gh issue create --title "Bug: ..." --body "Description..."

# List PRs
gh pr list

# Create PR
gh pr create --title "feat: ..." --body "Description..."

# View PR status
gh pr status
```

## Automation Setup

For automated commits and pushes:

```bash
# Store credentials (be careful with security)
git config --local credential.helper store

# Or use cache with timeout (seconds)
git config --local credential.helper 'cache --timeout=3600'
```

## Testing the Setup

Verify everything works:

```bash
cd ~/.openclaw/workspace/akiya-app

# Check git works
git status

# Check remote is accessible
git fetch origin

# Check GitHub CLI (if authenticated)
gh repo view
```

## Troubleshooting

### Permission Denied

```bash
# Check remote URL
git remote -v

# Update to use HTTPS with token
git remote set-url origin https://<token>@github.com/neko-no-otoko/ProjectYenListings.git
```

### Cannot Push to Main

```bash
# Create feature branch instead
git checkout -b feature/my-changes
git push -u origin feature/my-changes

# Then create PR via GitHub
```

### Large File Push Fails

```bash
# Check file sizes
find . -type f -size +10M

# Add to .gitignore if needed
echo "large-file.zip" >> .gitignore
```

## Security Notes

- Never commit API keys or secrets
- Use `.env` files (already in `.gitignore`)
- Rotate personal access tokens regularly
- Use SSH keys with passphrase when possible

## Maintenance

Regular tasks:
- [ ] Review and merge dependabot PRs
- [ ] Update documentation (WORKFLOW.md, DATA_SOURCES_GUIDE.md)
- [ ] Clean up old branches
- [ ] Review access permissions

---
*Generated: March 17, 2026*
