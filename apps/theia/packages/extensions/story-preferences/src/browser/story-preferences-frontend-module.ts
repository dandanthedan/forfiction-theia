import { ContainerModule } from '@theia/core/shared/inversify';
import { PreferenceContribution } from '@theia/core/lib/common/preferences';
import { ForfictionPreferencesContribution } from './story-preferences-contribution';

export default new ContainerModule((bind) => {
  bind(PreferenceContribution).to(ForfictionPreferencesContribution).inSingletonScope();
});
