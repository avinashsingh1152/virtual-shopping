#!/bin/bash

# Deployment Script for Virtual Shopping Platform
# This script automates the deployment process

echo "🚀 Virtual Shopping Platform - Deployment Script"
echo "=================================================="

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit for deployment"
    echo "✅ Git initialized"
else
    echo "✅ Git already initialized"
fi

# Frontend Deployment
echo ""
echo "🌐 Deploying Frontend to Vercel..."
echo "-----------------------------------"

cd frontend

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "📥 Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

cd ..

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Deploy backend to Render.com manually (see DEPLOYMENT.md)"
echo "2. Update VITE_API_BASE_URL in Vercel dashboard"
echo "3. Update CORS settings in backend with your Vercel URL"
echo ""
echo "📚 Full deployment guide: DEPLOYMENT.md"
