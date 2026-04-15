import { injectable } from '@theia/core/shared/inversify';
import { AIVariable, AIVariableContext, AIVariableResolutionRequest, AIVariableResolver, AIVariableService } from '@theia/ai-core';
import { StoryMemoryVariableContribution } from '../../common/story-memory-variable';
import { StoryMemoryService } from '../backend/story-memory-service';

/**
 * Resolves {{story:currentChapter}}, {{story:characters}}, {{story:lore}}, {{story:recentEvents}}
 * by calling the backend StoryMemoryService via JSON-RPC.
 * 
 * Theia AI automatically calls this resolver when an agent prompt contains
 * a {{story:<key>}} variable reference.
 */
@injectable()
export class StoryMemoryVariableContribution implements AIVariableContribution, AIVariableResolver {

  @inject(StoryMemoryService)
  private readonly storyMemory: StoryMemoryService;

  registerVariables(service: AIVariableService): void {
    service.registerResolver(STORY_MEMORY_VARIABLE, this);
  }

  async canResolve(request: AIVariableResolutionRequest, _: AIVariableContext): Promise<number> {
    return request.variable.name === 'story' ? 1 : 0;
  }

  async resolve(request: AIVariableResolutionRequest, _: AIVariableContext): Promise<{ variable: AIVariable; value: string } | undefined> {
    const arg = request.arg || 'currentChapter';
    
    try {
      let value: string;
      
      switch (arg) {
        case 'currentChapter': {
          const chapter = await this.storyMemory.getCurrentChapter();
          value = chapter ? `## Current Chapter: ${chapter.title}\n${chapter.summary}` : 'No current chapter.';
          break;
        }
        case 'characters': {
          const characters = await this.storyMemory.getCharacterStates();
          value = characters.length > 0
            ? characters.map(c => `- ${c.name}: ${c.state}`).join('\n')
            : 'No character states recorded.';
          break;
        }
        case 'lore': {
          const lore = await this.storyMemory.getLoreEntries();
          value = lore.length > 0
            ? lore.map(l => `- ${l.term}: ${l.entry}`).join('\n')
            : 'No lore entries.';
          break;
        }
        case 'recentEvents': {
          const recent = await this.storyMemory.getRecentChapterSummaries(3);
          value = recent.length > 0
            ? recent.map(r => `- ${r.title}: ${r.summary}`).join('\n')
            : 'No recent events.';
          break;
        }
        default:
          value = await this.storyMemory.buildStoryContextString();
      }

      return { variable: request.variable, value };
    } catch (error) {
      console.error('[forFiction] Story memory variable resolution failed:', error);
      return { variable: request.variable, value: 'Story context unavailable.' };
    }
  }
}

// Import shared variable definition
import { STORY_MEMORY_VARIABLE } from '../../common/story-memory-variable';
export { STORY_MEMORY_VARIABLE };
