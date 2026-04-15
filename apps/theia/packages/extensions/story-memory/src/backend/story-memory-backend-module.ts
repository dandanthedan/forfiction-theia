import { BackendApplicationContribution } from '@theia/core/lib/node';
import { ContainerModule } from '@theia/core/shared/inversify';
import { StoryMemoryService } from './story-memory-service';

export default new ContainerModule((bind) => {
  bind(StoryMemoryService).toSelf().inSingletonScope();
  bind(BackendApplicationContribution).toService(StoryMemoryService);
});
