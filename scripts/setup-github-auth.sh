#!/bin/bash
# GitHub Authentication Helper for Akiya App
# Run this script to authenticate with GitHub and enable pushes

REPO_PATH="$HOME/.openclaw/workspace/akiya-app"
cd "$REPO_PATH" || exit 1

echo "=== GitHub Authentication Setup ==="
echo ""
echo "Repository: neko-no-otoko/ProjectYenListings"
echo "Local path: $REPO_PATH"
echo ""

# Check if already authenticated
if git ls-remote origin &>/dev/null; then
    echo "✅ Already authenticated with GitHub"
    exit 0
fi

echo "Authentication required to push to GitHub."
echo ""
echo "Choose authentication method:"
echo ""
echo "1. Personal Access Token (Recommended for automation)"
echo "   - Generate at: https://github.com/settings/tokens"
echo "   - Required scopes: repo, workflow"
echo ""
echo "2. GitHub CLI (Interactive)"
echo "   - Run: gh auth login"
echo ""
echo "3. SSH Key"
echo "   - Requires SSH key setup"
echo ""

# Method 1: Token-based setup
setup_token() {
    echo ""
    read -sp "Enter GitHub Personal Access Token: " TOKEN
    echo ""
    
    # Update remote URL with token
    git remote set-url origin "https://${TOKEN}@github.com/neko-no-otoko/ProjectYenListings.git"
    
    # Test authentication
    if git ls-remote origin &>/dev/null; then
        echo "✅ Authentication successful!"
        
        # Store credentials
        echo "https://${TOKEN}@github.com" > ~/.git-credentials
        git config --global credential.helper store
        
        echo "Credentials stored for future use."
    else
        echo "❌ Authentication failed. Please check your token."
        git remote set-url origin "https://github.com/neko-no-otoko/ProjectYenListings.git"
        exit 1
    fi
}

# Method 2: GitHub CLI
setup_gh() {
    if ! command -v gh &> /dev/null; then
        echo "GitHub CLI not found. Installing..."
        brew install gh
    fi
    
    echo "Launching GitHub CLI authentication..."
    gh auth login --git-protocol https
}

# Method 3: SSH
setup_ssh() {
    echo "Setting up SSH authentication..."
    
    if [ ! -f "$HOME/.ssh/id_ed25519" ]; then
        echo "Generating SSH key..."
        ssh-keygen -t ed25519 -C "sora@openclaw.local" -f "$HOME/.ssh/id_ed25519" -N ""
    fi
    
    echo ""
    echo "Add this SSH key to GitHub:"
    echo "https://github.com/settings/keys"
    echo ""
    cat "$HOME/.ssh/id_ed25519.pub"
    echo ""
    
    read -p "Press Enter after adding the key to GitHub..."
    
    # Update remote to SSH
    git remote set-url origin "git@github.com:neko-no-otoko/ProjectYenListings.git"
    
    # Test
    if git ls-remote origin &>/dev/null; then
        echo "✅ SSH authentication successful!"
    else
        echo "❌ SSH authentication failed."
        git remote set-url origin "https://github.com/neko-no-otoko/ProjectYenListings.git"
        exit 1
    fi
}

# Main menu
echo "Enter choice (1-3): "
read -r CHOICE

case $CHOICE in
    1) setup_token ;;
    2) setup_gh ;;
    3) setup_ssh ;;
    *) echo "Invalid choice" ; exit 1 ;;
esac

echo ""
echo "Testing push capability..."
if git push --dry-run origin main &>/dev/null; then
    echo "✅ Ready to push!"
else
    echo "⚠️  Push test failed. Check authentication."
fi
