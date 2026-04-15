import { inject, injectable } from '@theia/core/shared/inversify';
import { EditorManager, EditorWidget } from '@theia/editor/lib/browser/editor-manager';
import { WorkspaceService } from '@theia/workspace/lib/common/workspace-service';
import { URI } from '@theia/core';

/**
 * StoryContextService — determines the active story ID from the currently open editor.
 *
 * Workspace convention (from forFiction):
 *   .forfiction/stories/{storyId}/chapters/{chapterFile}
 *
 * Examples:
 *   .forfiction/stories/abc-123/chapters/ch-01.md  → storyId: "abc-123"
 *   .forfiction/stories/my-novel/characters.json    → storyId: "my-novel"
 *
 * The story ID is the first path segment under `stories/`.
 */
@injectable()
export class StoryContextService {

  @inject(EditorManager)
  private readonly editorManager: EditorManager;

  @inject(WorkspaceService)
  private readonly workspaceService: WorkspaceService;

  /**
   * Get the storyId of the currently active (focused) editor.
   * Returns undefined if no story file is open.
   */
  async getActiveStoryId(): Promise<string | undefined> {
    const editor = this.editorManager.activeEditor;
    if (!editor) {
      // Try the most recently used editor
      const all = this.editorManager.all;
      const mostRecent = all.length > 0 ? all[all.length - 1] : null;
      if (!mostRecent) return undefined;
      return this.extractStoryId(mostRecent.uri);
    }
    return this.extractStoryId(editor.uri);
  }

  /**
   * Extract storyId from a file URI.
   * Convention: .forfiction/stories/{storyId}/...
   */
  extractStoryId(uri: URI): string | undefined {
    const path = uri.path.toString();
    const segments = path.split('/');

    // Find the index of 'stories' segment
    const storiesIndex = segments.indexOf('stories');
    if (storiesIndex === -1) return undefined;

    // storyId is the segment immediately after 'stories'
    const storyId = segments[storiesIndex + 1];
    return storyId || undefined;
  }

  /**
   * Get the workspace root URI.
   */
  getWorkspaceRoot(): URI | undefined {
    const roots = this.workspaceService.tryGetRoots();
    return roots.length > 0 ? roots[0].resource : undefined;
  }

  /**
   * Get the path to a story's directory.
   */
  getStoryPath(storyId: string): URI | undefined {
    const root = this.getWorkspaceRoot();
    if (!root) return undefined;
    return root.resolve(`.forfiction/stories/${storyId}`);
  }

  /**
   * Get the path to a chapter file within a story.
   */
  getChapterPath(storyId: string, chapterFile: string): URI | undefined {
    const storyRoot = this.getStoryPath(storyId);
    if (!storyRoot) return undefined;
    return storyRoot.resolve(`chapters/${chapterFile}`);
  }

  /**
   * Get all story IDs in the workspace.
   */
  async getAllStoryIds(): Promise<string[]> {
    const root = this.getWorkspaceRoot();
    if (!root) return [];

    const forfictionDir = root.resolve('.forfiction/stories');
    try {
      const dir = await this.workspaceService.resolve(forfictionDir, { resolveSingleChild: true });
      if (!dir.children) return [];
      return dir.children
        .filter(child => child.isDirectory)
        .map(child => child.resource.path.base);
    } catch {
      return [];
    }
  }

  /**
   * Get metadata for the active story.
   */
  async getActiveStoryMetadata(): Promise<{ id: string; title: string } | undefined> {
    const storyId = await this.getActiveStoryId();
    if (!storyId) return undefined;

    const metadataPath = this.getStoryPath(storyId)?.resolve('metadata.json');
    if (!metadataPath) return undefined;

    try {
      const { FileService } = await import('@theia/filesystem/lib/common/file-service');
      const fileService = this.container.get(FileService);
      const content = await fileService.readFile(metadataPath);
      const meta = JSON.parse(content.value.toString());
      return { id: storyId, title: meta.title || storyId };
    } catch {
      return { id: storyId, title: storyId };
    }
  }
}
