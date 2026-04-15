import { AIVariable, AIVariableContext, AIVariableResolver, AIVariableResolutionRequest, AIVariableService, ResolvedAIVariable } from '@theia/ai-core';

// Story memory variable — available to all agents as {{story:<key>}}
export const STORY_MEMORY_VARIABLE: AIVariable = {
  id: 'forfiction-story-memory',
  description: 'Story context from forFiction memory (current chapter, characters, lore)',
  name: 'story',
  args: [
    { name: 'currentChapter', description: 'Current chapter content and summary' },
    { name: 'characters', description: 'Character states and recent actions' },
    { name: 'lore', description: 'Lorebook entries relevant to current scene' },
    { name: 'recentEvents', description: 'Recent plot events from chapter summaries' }
  ]
};

// Reusable prompt fragment IDs for capability-style usage
export const STORY_CONTEXT_PROMPT_ID = 'forfiction-story-context';
