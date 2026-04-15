import { ContainerModule } from '@theia/core/shared/inversify';
import { CommandContribution, MenuContribution } from '@theia/core';
import { ForfictionChatContribution } from './chat-contribution';
import { FORFICTION_COMMANDS } from './commands';
import { StoryChatWidget } from './story-chat-widget';
import { NestJSSSEClient } from './nestjs-sse-client';

export default new ContainerModule((bind) => {
  // SSE client for NestJS backend
  bind(NestJSSSEClient).toSelf().inSingletonScope();

  // Widget
  bind(StoryChatWidget).toSelf();

  // Commands
  bind(CommandContribution).to(ForfictionChatContribution).inSingletonScope();
  bind(MenuContribution).to(ForfictionChatContribution).inSingletonScope();
});
