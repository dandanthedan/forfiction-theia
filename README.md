# forFiction — Theia Build

> Agentic fiction writing studio, rebuilt on Eclipse Theia.

## Architecture

**Option B: Theia shell + existing NestJS backend**

```
forfiction/
├── apps/
│   ├── theia/                    # Theia browser app (NEW)
│   │   └── packages/
│   │       ├── browser-app/      # Theia application
│   │       └── extensions/       # Custom extensions
│   │           ├── story-memory/       # RAG context for agents
│   │           ├── story-preferences/  # Writing rules as preferences
│   │           ├── story-editor/        # Monaco + streaming insert
│   │           ├── story-chat/          # AI chat + agent pipeline
│   │           ├── story-explorer/      # Story-aware file tree
│   │           └── skills/              # Skill YAML loader
│   │
│   └── services/                  # (EXISTING — renamed from apps/backend)
│       └── [NestJS: orchestrator, writer, reviewer, etc.]
│
└── libs/
    ├── commons/                   # (EXISTING)
    └── api-client/                # (EXISTING)
```

## Extensions

| Extension | Role |
|---|---|
| `story-memory` | Provides `{{story:currentChapter}}`, `{{story:characters}}`, etc. to agents via RAG |
| `story-preferences` | Writing rules as Theia preferences (show-not-tell, AI-isms, POV) |
| `story-editor` | Monaco editor with `StreamingContentHandler` for real-time agent output |
| `story-chat` | AI chat sidebar — Orchestrator, Writer, Reviewer agents |
| `story-explorer` | Story-aware file tree (Story → Chapters → Scenes) |
| `skills` | Loads `skill.yaml` files and registers as Theia AI prompt fragments |

## What Was Reused from Original

- All NestJS backend agents (Orchestrator, Writer, Reviewer, Editor, Skills agents)
- SSE streaming logic
- Story-memory service (chapter summaries, character states, lorebook, RAG)
- Writing rules / story-constraints
- Supabase auth + DB
- `libs/commons/`, `libs/api-client/`

## What Changed

- `apps/web/` (Next.js) → `apps/theia/` (Theia browser app)
- BlockNote editor → Monaco (`@theia/monaco`)
- Custom SSE chat client → Theia AI (`@theia/ai-chat`)

## Build

```bash
# Install deps
yarn install

# Build Theia app
yarn build:theia

# Start dev server (http://localhost:3000)
yarn start:theia
```

## Key Files

- `SPEC.md` — Full architecture spec
- `apps/theia/packages/extensions/story-chat/src/browser/orchestrator-agent.ts` — Orchestrator agent
- `apps/theia/packages/extensions/story-editor/src/browser/streaming-content-handler.ts` — Streaming to Monaco
- `apps/theia/packages/extensions/skills/src/backend/skill-loader.service.ts` — YAML skill loader
- `apps/theia/packages/extensions/story-memory/src/common/story-memory-variable.ts` — Story context variable
