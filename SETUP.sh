#!/bin/bash
# forFiction Theia — Quick Setup
# Run this on your MacBook to scaffold the full project.
#
# Prerequisites: Node.js 18+, yarn
#
# Usage: bash -c "$(curl -s https://raw.githubusercontent.com/dandanthedan/forfiction/main/SETUP.sh)"
#
# Or clone and run manually:
#   git clone https://github.com/dandanthedan/forfiction.git
#   cd forfiction
#   ./SETUP.sh

set -e

echo "=============================================="
echo " forFiction — Theia Build Setup"
echo "=============================================="
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Install from https://nodejs.org"; exit 1; }
command -v yarn >/dev/null 2>&1 || { echo "❌ yarn not found. Run: npm install -g yarn"; exit 1; }

NODE_VERSION=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ required. Current: $(node -v)"
  exit 1
fi

echo "✅ Node.js $(node -v), yarn $(yarn -v)"

# Clone the existing repo (or pull latest if already cloned)
if [ -d "forfiction-temp" ]; then
  echo "📁 forfiction-temp exists — pulling latest..."
  cd forfiction-temp && git pull && cd ..
else
  echo "📥 Cloning existing forFiction repo..."
  git clone https://github.com/symphco/forfiction-d0dc30.git forfiction-temp
fi

# Copy our new Theia structure on top
echo "📁 Setting up Theia structure..."
mkdir -p forfiction-temp/apps/theia/packages/extensions

# Copy extension files
cp -r extensions/story-memory forfiction-temp/apps/theia/packages/extensions/ 2>/dev/null || true
cp -r extensions/story-preferences forfiction-temp/apps/theia/packages/extensions/ 2>/dev/null || true
cp -r extensions/story-editor forfiction-temp/apps/theia/packages/extensions/ 2>/dev/null || true
cp -r extensions/story-chat forfiction-temp/apps/theia/packages/extensions/ 2>/dev/null || true
cp -r extensions/story-explorer forfiction-temp/apps/theia/packages/extensions/ 2>/dev/null || true
cp -r extensions/skills forfiction-temp/apps/theia/packages/extensions/ 2>/dev/null || true
cp -r extensions/browser-app forfiction-temp/apps/theia/packages/ 2>/dev/null || true

# Write package.json at root
cat > forfiction-temp/package.json << 'PKGJSON'
{
  "name": "@forfiction/monorepo",
  "version": "0.0.0",
  "private": true,
  "engines": {
    "node": ">=18"
  },
  "workspaces": [
    "apps/theia/packages/*",
    "apps/backend",
    "libs/*"
  ],
  "scripts": {
    "build:theia": "yarn --cwd apps/theia/packages/browser-app bundle",
    "start:theia": "yarn --cwd apps/theia/packages/browser-app start",
    "dev:theia": "yarn --cwd apps/theia/packages/browser-app watch",
    "start:backend": "yarn --cwd apps/backend start:dev",
    "dev": "concurrently \"yarn start:backend\" \"yarn start:theia\""
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
PKGJSON

# Write SPEC.md
cp extensions/../../SPEC.md forfiction-temp/SPEC.md 2>/dev/null || true

echo ""
echo "=============================================="
echo " Installation"
echo "=============================================="
cd forfiction-temp
yarn install

echo ""
echo "=============================================="
echo " Starting Backend (NestJS)"
echo "=============================================="
# Start NestJS in background
yarn start:backend &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for NestJS backend..."
for i in $(seq 1 30); do
  if curl -s http://localhost:3001/api/v1/health > /dev/null 2>&1; then
    echo "✅ Backend ready at http://localhost:3001"
    break
  fi
  sleep 1
done

echo ""
echo "=============================================="
echo " Starting Theia Frontend"
echo "=============================================="
yarn start:theia &
THEIA_PID=$!

echo ""
echo "✅ forFiction is starting..."
echo "   Backend: http://localhost:3001"
echo "   Frontend: http://localhost:3000 (Theia)"
echo ""
echo "   Press Ctrl+C to stop both."
echo ""

# Wait for Theia
wait $THEIA_PID
