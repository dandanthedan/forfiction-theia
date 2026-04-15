import { injectable } from '@theia/core/shared/inversify';
import { FileService } from '@theia/filesystem/lib/common/file-service';
import { WorkspaceService } from '@theia/workspace/lib/common/workspace-service';
import { URI } from '@theia/core';

export interface ChapterSummary {
  id: string;
  title: string;
  summary: string;
  wordCount: number;
  lastModified: string;
}

export interface CharacterState {
  id: string;
  name: string;
  state: string;
  lastSeen: string;
}

export interface LoreEntry {
  id: string;
  term: string;
  entry: string;
  tags: string[];
}

/**
 * Story Memory Service — loads and retrieves story context for AI agents.
 * Reads from the existing story-memory files in the workspace:
 *   .forfiction/chapters/, .forfiction/characters/, .forfiction/lore/
 * 
 * This service is used by STORY_MEMORY_VARIABLE to inject context
 * into agent prompts via Theia AI's variable resolution system.
 */
@injectable()
export class StoryMemoryService {
  
  @inject(FileService)
  private readonly fileService: FileService;

  @inject(WorkspaceService)
  private readonly wsService: WorkspaceService;

  private baseUri(): URI | undefined {
    return this.wsService.tryGetRoot();
  }

  private forfictionPath(...segments: string[]): string {
    const base = this.baseUri();
    if (!base) return '';
    return base.resolve('.forfiction').resolve(...segments).toString();
  }

  /**
   * Get current chapter content + summary.
   * The "current" chapter is determined by the active editor tab.
   */
  async getCurrentChapter(editorUri?: string): Promise<ChapterSummary | null> {
    try {
      const path = this.forfictionPath('chapters', 'current.json');
      if (!path) return null;
      const content = await this.fileService.readFile(new URI(path));
      return JSON.parse(content.value.toString()) as ChapterSummary;
    } catch {
      return null;
    }
  }

  /**
   * Get all character states for context injection.
   */
  async getCharacterStates(): Promise<CharacterState[]> {
    try {
      const path = this.forfictionPath('characters', 'states.json');
      if (!path) return [];
      const content = await this.fileService.readFile(new URI(path));
      return JSON.parse(content.value.toString()) as CharacterState[];
    } catch {
      return [];
    }
  }

  /**
   * Get lorebook entries relevant to current scene (tag-based filtering).
   */
  async getLoreEntries(tags: string[] = []): Promise<LoreEntry[]> {
    try {
      const path = this.forfictionPath('lore', 'lorebook.json');
      if (!path) return [];
      const content = await this.fileService.readFile(new URI(path));
      const all = JSON.parse(content.value.toString()) as LoreEntry[];
      if (tags.length === 0) return all;
      return all.filter(e => e.tags.some(t => tags.includes(t)));
    } catch {
      return [];
    }
  }

  /**
   * Get recent chapter summaries for continuity context.
   */
  async getRecentChapterSummaries(count: number = 5): Promise<ChapterSummary[]> {
    try {
      const path = this.forfictionPath('chapters', 'summaries.json');
      if (!path) return [];
      const content = await this.fileService.readFile(new URI(path));
      const all = JSON.parse(content.value.toString()) as ChapterSummary[];
      return all.slice(-count);
    } catch {
      return [];
    }
  }

  /**
   * Format story context as a readable string for prompt injection.
   */
  async buildStoryContextString(): Promise<string> {
    const [chapter, characters, lore, recent] = await Promise.all([
      this.getCurrentChapter(),
      this.getCharacterStates(),
      this.getLoreEntries(),
      this.getRecentChapterSummaries(3)
    ]);

    const parts: string[] = [];

    if (chapter) {
      parts.push(`## Current Chapter: ${chapter.title}\n${chapter.summary}`);
    }

    if (characters.length > 0) {
      parts.push(`## Characters\n${characters.map(c => `- ${c.name}: ${c.state}`).join('\n')}`);
    }

    if (recent.length > 0) {
      parts.push(`## Recent Events\n${recent.map(r => `- ${r.title}: ${r.summary}`).join('\n')}`);
    }

    if (lore.length > 0) {
      parts.push(`## Lore\n${lore.map(l => `- ${l.term}: ${l.entry}`).join('\n')}`);
    }

    return parts.length > 0 ? parts.join('\n\n') : 'No story context available.';
  }
}
