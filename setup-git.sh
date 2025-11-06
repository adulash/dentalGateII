#!/bin/bash

# DentalGate II - Git Repository Setup for Coolify Deployment

echo "================================================"
echo "DentalGate II - Git Setup for Coolify"
echo "================================================"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Initialize git repository if not already initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    echo "✅ Git initialized"
else
    echo "✅ Git repository already initialized"
fi

# Add all files
echo ""
echo "📝 Adding files to Git..."
git add .

# Check if there are changes to commit
if git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "ℹ️  No changes to commit"
else
    echo "💾 Committing files..."
    git commit -m "Initial commit - Ready for Coolify deployment"
    echo "✅ Files committed"
fi

echo ""
echo "================================================"
echo "📋 Next Steps:"
echo "================================================"
echo ""
echo "1. Create repository on GitHub/GitLab:"
echo "   - Go to GitHub and create new repository"
echo "   - Name: dentalGateII"
echo "   - Don't initialize with README"
echo ""
echo "2. Add remote and push:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/dentalGateII.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Deploy to Coolify:"
echo "   - Follow guide in COOLIFY_DEPLOY.md"
echo "   - Use checklist in COOLIFY_CHECKLIST.md"
echo ""
echo "================================================"
echo "✅ Git setup complete!"
echo "================================================"

