#!/bin/bash

# 🎮 TicTacToe - Git Repository Initialization Script

echo "🚀 Initializing Git repository for TicTacToe..."
echo ""

# Check if already a git repo
if [ -d ".git" ]; then
  echo "⚠️  Git repository already exists!"
  echo "Current status:"
  git status
  exit 0
fi

# Initialize git
echo "📦 Initializing git..."
git init

# Add all files
echo "➕ Adding all files..."
git add .

# Create initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: Complete TicTacToe multiplayer game

Features:
- Real-time multiplayer gameplay
- Automatic symbol assignment (X/O)
- Win/draw detection
- Working leaderboard with stats tracking
- WebSocket communication
- Docker containerization
- Complete documentation
- Production deployment guides
"

echo ""
echo "✅ Git repository initialized successfully!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Create a new repository on GitHub or GitLab"
echo ""
echo "2. Add the remote URL:"
echo "   git remote add origin YOUR_REPO_URL"
echo ""
echo "3. Push to remote:"
echo "   git push -u origin main"
echo ""
echo "Example:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/tictactoe-multiplayer.git"
echo "   git push -u origin main"
echo ""
