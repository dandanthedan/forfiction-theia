#!/bin/bash
set -e

echo "========================================"
echo " forFiction — Cloud Setup"
echo "========================================"

# Install global deps
npm install -g yarn --silent 2>/dev/null || true

# The workspace has Theia extensions but needs the NestJS backend
# Clone the original repo and symlink apps/backend
if [ ! -d "apps/backend" ]; then
  echo "📥 Pulling NestJS backend from original repo..."
  git clone --depth 1 https://github.com/symphco/forfiction-d0dc30.git /tmp/forfiction-original
  ln -s /tmp/forfiction-original/apps/backend apps/backend
  ln -s /tmp/forfiction-original/libs libs
fi

# Install deps
echo "📦 Installing dependencies..."
yarn install 2>&1 | tail -3

# Build Theia frontend
echo "🔨 Building Theia frontend..."
yarn build:theia 2>&1 | tail -5

echo ""
echo "========================================"
echo " ✅ Setup complete!"
echo "========================================"
echo ""
echo " Starting forFiction (both services)..."
echo "   Theia  → http://localhost:3000"
echo "   Backend → http://localhost:3001"
echo ""

# Start everything
yarn dev
