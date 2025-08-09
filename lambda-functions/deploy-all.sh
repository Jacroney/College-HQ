#!/bin/bash

# Deploy all Lambda functions
# Usage: ./deploy-all.sh

echo "🚀 Deploying all Lambda functions..."

# Array of function directories
functions=(
    "auth-handler"
    "profile-service"
    "advising-service"
    "course-service"
    "conversation-service"
)

# Deploy each function
for func in "${functions[@]}"; do
    if [ -d "$func" ] && [ -f "$func/package.json" ]; then
        echo "📦 Deploying $func..."
        cd "$func"
        
        # Install dependencies if needed
        if [ ! -d "node_modules" ]; then
            echo "   Installing dependencies..."
            npm install --production
        fi
        
        # Run deploy script
        if npm run deploy; then
            echo "   ✅ $func deployed successfully"
        else
            echo "   ❌ Failed to deploy $func"
        fi
        
        cd ..
        echo ""
    else
        echo "⚠️  Skipping $func (not found or no package.json)"
    fi
done

echo "✨ Deployment complete!"