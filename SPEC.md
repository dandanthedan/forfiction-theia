# forFiction — Theia Build Specification

## Status
**ACTIVE BUILD** — Started 2026-04-15

## Architecture
**Option B: Theia shell + existing NestJS backend**

### Stack
- **Frontend shell**: Eclipse Theia browser app (TypeScript)
- **Editor**: Monaco editor (`@theia/monaco`) — replaces BlockNote/ProseMirror
- **AI layer**: Theia AI (`@theia/ai-chat`, `@theia/ai-core`) — replaces custom Next.js chat
- **Backend**: Existing NestJS (`apps/backend/`) — unchanged
- **Shared libs**: `libs/commons/`, `libs/api-client/` — unchanged
- **Database/Auth**: Existing Supabase — unchanged
- **Monorepo tool**: Nx — unchanged

### What Changes
- `apps/web/` (Next.js) → `apps/theia/` (Theia browser app)
- BlockNote editor → `@theia/monaco` with streaming insert
- Custom chat sidebar → Theia AI Chat UI
- `src/components/` → Theia extension packages

### What Stays
- `services/` (renamed from `apps/backend/`) — all agent code
- `libs/commons/` — types
- `libs/api-client/` — Supabase client
- All writing rules, prompts, SSE streaming logic

---

## Directory Structure

```
forfiction/
├── apps/
│   ├── theia/                                    # NEW
│   │   └── packages/
│   │       ├── browser-app/                     # Generated Theia browser app
│   │       │   ├── package.json
│   │       │   └── src/
│   │       │
│   │       └── extensions/                      # Custom Theia extensions
│   │           ├── story-editor/                # Monaco wrapper + streaming
│   │           ├── story-explorer/              # File tree (adapts FileTree.tsx)
│   │           ├── story-chat/                 # AI chat sidebar (adapts AIChatSidebar.tsx)
│   │           ├── story-memory/               # Story memory backend service
│   │           ├── story-preferences/           # Writing rules + settings
│   │           └── skills/                      # Skill loader (YAML → prompt fragments)
│   │
│   └── services/                                # EXISTING (renamed from apps/backend)
│       └── [all NestJS code unchanged]
│
├── libs/
│   ├── commons/                                  # EXISTING
│   └── api-client/                               # EXISTING
│
├── SPEC.md                                       # This file
└── README.md
```

---

## Extension: Story Editor (`story-editor`)

### Role
Wraps Monaco editor with streaming content insertion from Writer agent.

### Key Files
```
story-editor/
├── src/
│   ├── browser/
│   │   ├── story-editor-widget.ts               # Main editor widget
│   │   ├── streaming-content-handler.ts          # Insert streamed content at cursor
│   │   └── story-editor-frrontend-module.ts
│   └── common/
│       └── story-editor-token.ts
├── package.json
└── skill.yaml                                    # Skill definition (optional)
```

### Behavior
1. Opens `.md`, `.txt`, `.story` files in Monaco
2. Receives SSE stream events from NestJS backend
3. Inserts content via `editor.executeEdits()` for streaming chunks
4. Registers `write-to-editor` tool function via Theia AI

---

## Extension: Story Explorer (`story-explorer`)

### Role
Left panel file tree — adapted from existing `FileTree.tsx`

### Key Files
```
story-explorer/
├── src/
│   ├── browser/
│   │   ├── story-explorer-widget.ts
│   │   ├── file-tree-node.ts
│   │   ├── story-tree-content.ts               # Story structure (chapters, characters)
│   │   └── story-explorer-frontend-module.ts
│   └── common/
│       └── index.ts
└── package.json
```

### Behavior
1. Reads `stories/` directory in workspace
2. Builds tree: Story → Chapters → Scenes
3. Context menu: New Chapter, New Scene, Rename, Delete
4. Double-click: opens file in story-editor
5. Integrates with Supabase (loads story metadata)

---

## Extension: Story Chat (`story-chat`)

### Role
AI chat sidebar — adapted from existing `AIChatSidebar.tsx`

### Key Files
```
story-chat/
├── src/
│   ├── browser/
│   │   ├── story-chat-widget.ts
│   │   ├── chat-message-renderer.tsx
│   │   ├── agent-step-tracker.ts
│   │   └── story-chat-frontend-module.ts
│   ├── common/
│   │   └── index.ts
└── package.json
```

### Behavior
1. Uses Theia AI Chat API (not custom SSE client)
2. Registers agents: Orchestrator, Writer, Reviewer, Editor
3. Shows agent steps as they execute
4. Streams content to Monaco editor via `write-to-editor` tool
5. Uses `story-memory` context variable for RAG context

---

## Extension: Story Memory (`story-memory`)

### Role
Backend service that provides RAG context to agents

### Key Files
```
story-memory/
├── src/
│   ├── backend/
│   │   ├── story-memory-service.ts              # RAG retrieval + injection
│   │   ├── chapter-summary-provider.ts
│   │   ├── character-state-provider.ts
│   │   └── lorebook-provider.ts
│   ├── common/
│   │   └── story-memory-variable.ts            # AIVariableContribution
│   └── index.ts
└── package.json
```

### Behavior
1. Loads from existing `services/src/app/story-memory/` (moved to `libs/`)
2. Exposes `{{story:currentChapter}}`, `{{story:characters}}`, `{{story:lore}}` variables
3. Uses existing embedding service (OpenAI `text-embedding-3-small`)
4. Registers as AIVariableContribution (global variable)

---

## Extension: Story Preferences (`story-preferences`)

### Role
Writing rules + user settings as Theia preferences

### Key Files
```
story-preferences/
├── src/
│   ├── browser/
│   │   └── story-preferences-contribution.ts   # PreferenceProvider
│   └── common/
│       └── writing-rules.ts                    # Writing rules constants
└── package.json
```

### Behavior
1. Exposes writing rules as Theia preference schema
2. Users configure via Theia Settings (`Ctrl+,`)
3. Rules feed into Orchestrator agent prompt fragment
4. Existing `story-constraints/` service wrapped as preference validator

---

## Extension: Skills (`skills`)

### Role
Skill loader — loads `skill.yaml` files → registers Theia AI prompt fragments

### Key Files
```
skills/
├── src/
│   ├── browser/
│   │   ├── skill-tree-widget.ts                 # Skill browser UI
│   │   └── skill-detail-panel.ts
│   ├── backend/
│   │   ├── skill-loader.service.ts             # Reads skill.yaml, registers fragments
│   │   ├── yaml-parser.ts
│   │   └── skill-registry.ts
│   └── common/
│       └── skill-schema.ts                      # skill.yaml schema
└── package.json
```

### Behavior
1. Scans `forfiction/skills/` directory
2. Parses each `skill.yaml`
3. Registers prompt fragments via `PromptService`
4. Creates ChatAgent wrapper for each skill
5. Shows skill tree in sidebar

---

## Naming Conventions

- Extension package names: `@forfiction/extension-story-editor`, etc.
- Theia AI agent IDs: `forfiction.orchestrator`, `forfiction.writer`, etc.
- Command IDs: `forfiction.story.open`, `forfiction.chat.send`, etc.
- Preference IDs: `forfiction.writing.show-not-tell`, etc.

---

## Build Order

1. **story-memory** (foundation — all agents need context)
2. **story-preferences** (writing rules needed by agents)
3. **story-editor** (editor widget + streaming insert)
4. **story-chat** (chat UI + agent registration)
5. **story-explorer** (file tree)
6. **skills** (skill loader + YAML registration)
7. **browser-app** (compose all extensions)

---

## Open Questions

- [ ] Does Theia AI support custom SSE LLM endpoints (our NestJS pipeline)?
- [ ] Monaco streaming insert — does `editor.executeEdits()` handle high-frequency updates well?
- [ ] How to handle auth? Theia browser app needs Supabase auth token from login flow.
- [ ] Git branch strategy: new repo `forfiction-theia` or branch in existing?
