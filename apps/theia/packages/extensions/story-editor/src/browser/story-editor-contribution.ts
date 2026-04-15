import { inject, injectable } from '@theia/core/shared/inversify';
import { Command, CommandContribution, CommandRegistry } from '@theia/core/lib/common/command';
import { EditorManager } from '@theia/editor/lib/browser/editor-manager';
import { StreamingContentHandler } from './streaming-content-handler';

export const WRITE_TO_EDITOR_COMMAND: Command = {
  id: 'forfiction.write-to-editor',
  label: 'forFiction: Write to Editor'
};

export const FINALIZE_CONTENT_COMMAND: Command = {
  id: 'forfiction.finalize-content',
  label: 'forFiction: Finalize Content'
};

@injectable()
export class StoryEditorCommandContribution implements CommandContribution {

  @inject(EditorManager)
  private readonly editorManager: EditorManager;

  @inject(StreamingContentHandler)
  private readonly streamingHandler: StreamingContentHandler;

  registerCommands(registry: CommandRegistry): void {
    registry.registerCommand(WRITE_TO_EDITOR_COMMAND, {
      execute: (text: string, position: 'cursor' | 'end' = 'cursor') => {
        if (text) {
          this.streamingHandler.onContentChunk(text);
        }
      }
    });

    registry.registerCommand(FINALIZE_CONTENT_COMMAND, {
      execute: () => {
        this.streamingHandler.onStreamComplete();
      }
    });
  }
}
