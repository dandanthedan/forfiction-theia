# forFiction Theia — Run Instructions

## What You Need

- Node.js 18+
- yarn (`npm install -g yarn`)
- The existing `forfiction-d0dc30` repo's backend running (NestJS on port 3001)

---

## Option A: Fresh Clone (Recommended)

```bash
# 1. Clone the new Theia repo
git clone https://github.com/dandanthedan/forfiction-theia.git
cd forfiction-theia

# 2. Add the backend from the original repo (symlink or copy)
# The backend code lives in apps/backend — you can either:
# a) Clone the original and symlink:
git clone https://github.com/symphco/forfiction-d0dc30.git original-forfiction
ln -s ../original-forfiction/apps/backend apps/backend

# b) OR just copy the backend folder:
cp -r ../original-forfiction/apps/backend apps/backend

# 3. Install dependencies
yarn install

# 4. Start NestJS backend (from original repo)
cd apps/backend
yarn start:dev &
cd ../..

# 5. Build Theia
yarn build:theia

# 6. Start Theia frontend
yarn start:theia
```

Open **http://localhost:3000** — you should see the Theia IDE with the forFiction chat panel on the right.

---

## Option B: Add to Existing `forfiction-d0dc30`

```bash
cd ~/path/to/forfiction-d0dc30

# 1. Create the Theia app structure
mkdir -p apps/theia/packages/extensions
mkdir -p apps/theia/packages/browser-app/src

# 2. Copy the extension packages from this repo:
cp -r /path/to/forfiction-theia/apps/theia/packages/extensions/* apps/theia/packages/extensions/
cp -r /path/to/forfiction-theia/apps/theia/packages/browser-app/* apps/theia/packages/browser-app/

# 3. Copy package.json from this repo to root, merging workspaces
# (See package.json in this repo's root)

# 4. Install + build
yarn install
yarn build:theia
yarn start:theia
```

---

## Expected Result

```
http://localhost:3000
├── Theia IDE shell (Monaco editor, file tree, terminal)
├── forFiction Chat panel (right side)
│   ├── Orchestrator agent
│   ├── Write / Revise mode toggle
│   └── Streaming chapter output
└── Story Explorer (left — Story > Chapters > Scenes)
```

---

## If It Doesn't Work

**Theia build errors:**
```bash
# Clean + rebuild
yarn --cwd apps/theia/packages/browser-app rebuild
yarn build:theia
```

**Backend not connecting:**
- Make sure NestJS is running on port 3001
- Check CORS settings in NestJS — Theia frontend (port 3000) needs to be allowed

**Extensions not loading:**
- Check theia app logs in browser console (`F12`)
- Common issue: missing `@theia/core` dependency version mismatch

---

## What's Working Now

✅ Story chat widget (right panel) — connects to NestJS SSE  
✅ OrchestratorAgent routing to NestJS `/:storyId/stream` endpoint  
✅ Content delta streaming (partial text chunks)  
✅ Agent step indicators  
✅ Streaming insert into Monaco editor via DOM events  
✅ Writing rules as Theia preferences  
✅ Skill YAML loading → prompt fragments  
✅ **Story auto-detection** from open editor path  
✅ **Auth token command** — `forFiction: Set Auth Token` (window.prompt)  
✅ **Backend URL preference** — configurable  

## What's Stubbed

⚠️ Skill tree UI — skill browser sidebar not yet built  
⚠️ Story explorer — tree renders but context menu actions are stubs  
⚠️ Mastra pipeline wiring — uses legacy pipeline, not Mastra agents yet  
⚠️ Login flow — uses window.prompt (fine for dev)  
