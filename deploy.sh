#!/bin/bash
# Magic Mirror Deploy Script
# Runs on Raspberry Pi to pull, build, and restart the application
set -e  # Exit on any error

APP_DIR="/home/jjones/magic-mirror"
cd "$APP_DIR"

START_TIME=$(date +%s)

echo "============================================"
echo "Magic Mirror Deploy - $(date)"
echo "============================================"

# Pull latest changes
echo ""
echo "📥 Pulling latest changes from origin/main..."
git fetch origin main
git reset --hard origin/main
echo "   Current commit: $(git rev-parse --short HEAD)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm ci --silent

# Build production
echo ""
echo "🔨 Building production bundle..."
npm run build

# Restart pm2
echo ""
echo "♻️  Restarting pm2 server..."
pm2 restart magic-mirror --silent

# Health check
echo ""
echo "🏥 Running health check..."
sleep 3
if curl -sf http://localhost:3000 > /dev/null; then
    echo "   ✅ Server is healthy!"
else
    echo "   ❌ Health check failed!"
    exit 1
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "============================================"
echo "🎉 Deploy complete in ${DURATION}s!"
echo "============================================"
