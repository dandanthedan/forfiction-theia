import { ContainerModule } from '@theia/core/shared/inversify';
import { CommandContribution, MenuContribution } from '@theia/core';
import { PreferenceContribution } from '@theia/core/lib/common/preferences';
import {
  ForfictionChatContribution,
  ForfictionPreferencesContribution
} from './chat-contribution';
import { FORFICTION_COMMANDS, ForfictionAuthCommandContribution } from './commands';
import { StoryChatWidget } from './story-chat-widget';
import { NestJSSSEClient } from './nestjs-sse-client';
import { StoryContextService } from './story-context-service';

export default new ContainerModule((bind) => {
  // SSE client for NestJS backend
  bind(NestJSSSEClient).toSelf().inSingletonScope();

  // Story context detection (active editor → storyId)
  bind(StoryContextService).toSelf().inSingletonScope();

  // Widget
  bind(StoryChatWidget).toSelf();

  // Preferences
  bind(PreferenceContribution).to(ForfictionPreferencesContribution).inSingletonScope();

  // Commands
  bind(CommandContribution).to(ForfictionChatContribution).inSingletonScope();
  bind(CommandContribution).to(ForfictionAuthCommandContribution).inSingletonScope();
  bind(MenuContribution).to(ForfictionChatContribution).inSingletonScope();
});
