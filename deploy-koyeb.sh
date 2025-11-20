#!/bin/bash

# Koyeb Deployment Script for Secure AI Vault
# This script prepares your app for deployment on Koyeb

set -e  # Exit on error

echo "🚀 Koyeb Deployment Preparation"
echo "================================"
echo ""

# Function to display menu
show_menu() {
    echo "Select deployment option:"
    echo "1) Backend Only (Recommended - Deploy backend to Koyeb, frontend to Vercel)"
    echo "2) Full Stack (Deploy both backend + frontend to Koyeb)"
    echo "3) Exit"
    echo ""
}

# Function for Option 1: Backend Only
deploy_backend_only() {
    echo "📦 Option 1: Backend Only Deployment"
    echo "====================================="
    echo ""
    echo "✅ Backend will be deployed to Koyeb"
    echo "✅ Frontend will be deployed to Vercel/Netlify"
    echo ""
    echo "Steps:"
    echo "1. Push your code to GitHub"
    echo "2. Go to Koyeb dashboard and create a new service"
    echo "3. Select GitHub and choose your repository"
    echo "4. Use Dockerfile: Dockerfile.backend-only"
    echo "5. Set environment variables (see KOYEB_DEPLOYMENT_GUIDE.md)"
    echo "6. Deploy backend"
    echo "7. Go to Vercel and import your project"
    echo "8. Set root directory to 'client'"
    echo "9. Set VITE_API_URL to your Koyeb backend URL"
    echo "10. Deploy frontend"
    echo ""
    echo "📖 Full guide: KOYEB_DEPLOYMENT_GUIDE.md"
}

# Function for Option 2: Full Stack
deploy_full_stack() {
    echo "📦 Option 2: Full Stack Deployment"
    echo "==================================="
    echo ""
    
    # Check if client directory exists
    if [ ! -d "client" ]; then
        echo "❌ Error: client directory not found!"
        exit 1
    fi
    
    # Build frontend
    echo "🔨 Building frontend..."
    cd client
    
    if [ ! -f "package.json" ]; then
        echo "❌ Error: client/package.json not found!"
        exit 1
    fi
    
    npm install
    npm run build
    
    if [ $? -ne 0 ]; then
        echo "❌ Frontend build failed!"
        exit 1
    fi
    
    echo "✅ Frontend build successful!"
    
    # Copy build to server
    echo "📂 Copying build to server..."
    cd ..
    rm -rf server/client-build
    cp -r client/build server/client-build
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to copy build files!"
        exit 1
    fi
    
    echo "✅ Build files copied to server/client-build"
    echo ""
    echo "📝 Next Steps:"
    echo "1. Commit the changes:"
    echo "   git add server/client-build"
    echo "   git commit -m 'Build frontend for Koyeb deployment'"
    echo "   git push origin main"
    echo ""
    echo "2. Go to Koyeb dashboard"
    echo "3. Create new service from GitHub"
    echo "4. Use Dockerfile: Dockerfile.koyeb"
    echo "5. Set environment variables (see KOYEB_DEPLOYMENT_GUIDE.md)"
    echo "6. Deploy!"
    echo ""
    echo "📖 Full guide: KOYEB_DEPLOYMENT_GUIDE.md"
}

# Main script
echo "Current directory: $(pwd)"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory!"
    echo "Please run this script from the secure_ai_vault directory"
    exit 1
fi

show_menu

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        deploy_backend_only
        ;;
    2)
        deploy_full_stack
        ;;
    3)
        echo "👋 Exiting..."
        exit 0
        ;;
    *)
        echo "❌ Invalid choice!"
        exit 1
        ;;
esac

echo ""
echo "✨ Preparation complete!"
echo ""
echo "📚 Resources:"
echo "- Koyeb Dashboard: https://app.koyeb.com"
echo "- Vercel Dashboard: https://vercel.com/dashboard"
echo "- Deployment Guide: KOYEB_DEPLOYMENT_GUIDE.md"
echo ""

