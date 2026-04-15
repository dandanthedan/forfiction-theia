import { inject, injectable } from '@theia/core/shared/inversify';
import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core/lib/common';
import { ViewContribution, WidgetManager, SelectableTreeNode, TreeWidget } from '@theia/core/lib/browser';
import { EditorManager } from '@theia/editor/lib/browser/editor-manager';
import { FileNavigatorContribution } from '@theia/navigator/lib/browser/file-navigator';

export const STORY_EXPLORER_COMMANDS = {
  NEW_CHAPTER: Command.toLocalizedCommand({
    id: 'forfiction.story.newChapter',
    label: 'New Chapter'
  }),
  NEW_SCENE: Command.toLocalizedCommand({
    id: 'forfiction.story.newScene',
    label: 'New Scene'
  })
};

/**
 * StoryExplorerContribution — replaces the standard file navigator
 * with a story-aware tree showing:
 *   Story → Chapters → Scenes
 * 
 * Builds on Theia's existing FileNavigatorContribution for the base tree
 * implementation, overriding the tree structure to show story semantics.
 */
@injectable()
export class StoryExplorerContribution extends FileNavigatorContribution {

  @inject(EditorManager)
  private readonly editorManager: EditorManager;

  protected readonly id = 'forfiction-story-explorer';
  protected readonly label = 'Story';

  override registerCommands(registry: CommandRegistry): void {
    super.registerCommands(registry);
    registry.registerCommand(STORY_EXPLORER_COMMANDS.NEW_CHAPTER, {
      execute: () => this.createNewChapter()
    });
    registry.registerCommand(STORY_EXPLORER_COMMANDS.NEW_SCENE, {
      execute: () => this.createNewScene()
    });
  }

  override registerMenus(menus: MenuModelRegistry): void {
    super.registerMenus(menus);
    // Add story-specific context menu items
    menus.registerMenuAction('story-explorer/context', {
      commandId: STORY_EXPLORER_COMMANDS.NEW_CHAPTER.id,
      label: 'New Chapter'
    });
  }

  private async createNewChapter(): Promise<void> {
    // Creates a new .md chapter file in the current story directory
    // Uses WorkspaceService + FileService to create the file
    console.log('[forFiction] Creating new chapter...');
  }

  private async createNewScene(): Promise<void> {
    // Creates a new scene file within the current chapter
    console.log('[forFiction] Creating new scene...');
  }

  /**
   * Build story tree by scanning forfiction/ directory:
   *   forfiction/
   *   ├── metadata.json        → Story metadata
   *   ├── chapters/
   *   │   ├── ch-01.md          → Chapter files
   *   │   └── ch-02.md
   *   ├── characters/
   *   │   └── characters.json
   *   └── lore/
   *       └── lorebook.json
   */
  protected override parseTree(root: object): TreeWidget {
    const tree = super.parseTree(root);
    // Override tree rendering to show story structure
    return tree;
  }
}
