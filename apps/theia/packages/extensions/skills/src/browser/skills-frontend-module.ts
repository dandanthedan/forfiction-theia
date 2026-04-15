import { ContainerModule } from '@theia/core/shared/inversify';
import { AIVariableContribution } from '@theia/ai-core';
import { SkillTreeContribution } from './skill-tree-contribution';

export default new ContainerModule((bind) => {
  bind(AIVariableContribution).to(SkillTreeContribution).inSingletonScope();
});
