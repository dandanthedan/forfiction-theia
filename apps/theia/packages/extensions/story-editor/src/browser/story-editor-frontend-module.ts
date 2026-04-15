import { ContainerModule } from '@theia/core/shared/inversify';
import { EditorManager } from '@theia/editor/lib/browser/editor-manager';
import { StreamingContentHandler } from './streaming-content-handler';
import { StoryEditorCommandContribution } from './story-editor-contribution';
import { CommandContribution } from '@theia/core/lib/common/command';

export default new ContainerModule((bind) => {
  // Streaming content handler — singleton, shared across all editor instances
  bind(StreamingContentHandler).toSelf().inSingletonScope();

  // Register write-to-editor command
  bind(CommandContribution).to(StoryEditorCommandContribution).inSingletonScope();
});
