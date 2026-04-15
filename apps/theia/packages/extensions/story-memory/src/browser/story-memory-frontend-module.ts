import { ContainerModule } from '@theia/core/shared/inversify';
import { AIVariableContribution, AIVariableService } from '@theia/ai-core';
import { StoryMemoryVariableContribution } from './story-memory-variable-contribution';

export default new ContainerModule((bind) => {
  bind(AIVariableContribution).to(StoryMemoryVariableContribution).inSingletonScope();
});
