import { ContainerModule } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { SkillLoaderService } from './skill-loader.service';

export default new ContainerModule((bind) => {
  bind(SkillLoaderService).toSelf().inSingletonScope();
  bind(BackendApplicationContribution).toService(SkillLoaderService);
});
