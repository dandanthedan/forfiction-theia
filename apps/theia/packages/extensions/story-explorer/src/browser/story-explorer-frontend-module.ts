import { ContainerModule } from '@theia/core/shared/inversify';
import { ViewContribution, WidgetManager } from '@theia/core/lib/browser';
import { FileNavigatorContribution } from '@theia/navigator/lib/browser/file-navigator';
import { CommandContribution } from '@theia/core/lib/common/command';
import { StoryExplorerContribution } from './story-explorer-contribution';

export default new ContainerModule((bind) => {
  bind(StoryExplorerContribution).toSelf().inSingletonScope();
  bind(CommandContribution).to(StoryExplorerContribution).inSingletonScope();
  bind(ViewContribution).to(StoryExplorerContribution).inSingletonScope();
});
