import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core/lib/common';
import { inject, injectable } from '@theia/core/shared/inversify';
import { PreferenceContribution } from '@theia/core/lib/common/preferences';
import { StoryChatWidget, StoryChatWidget_ID } from './story-chat-widget';

export const FORFICTION_COMMANDS = {
  OPEN_CHAT: Command.toLocalizedCommand({
    id: 'forfiction.chat.open',
    label: 'forFiction: Open Chat',
  }),
  NEW_STORY: Command.toLocalizedCommand({
    id: 'forfiction.story.new',
    label: 'forFiction: New Story',
  }),
  REVIEW_CURRENT: Command.toLocalizedCommand({
    id: 'forfiction.story.review',
    label: 'forFiction: Review Current Chapter',
  }),
  SET_AUTH_TOKEN: Command.toLocalizedCommand({
    id: 'forfiction.auth.setToken',
    label: 'forFiction: Set Auth Token',
  }),
  SET_BACKEND_URL: Command.toLocalizedCommand({
    id: 'forfiction.config.setBackendUrl',
    label: 'forFiction: Set Backend URL',
  }),
};

export const FORFICTION_AUTH_TOKEN_KEY = 'forfiction.authToken';
export const FORFICTION_BACKEND_URL_KEY = 'forfiction.backendUrl';
export const DEFAULT_BACKEND_URL = 'http://localhost:3001';

export const forfictionPreferenceSchema: PreferenceContribution['schema'] = {
  id: 'forfiction',
  title: 'forFiction',
  type: 'object',
  properties: {
    [FORFICTION_AUTH_TOKEN_KEY]: {
      type: 'string',
      title: 'Auth Token',
      description: 'Supabase auth token. Set via "forFiction: Set Auth Token" command.',
      default: ''
    },
    [FORFICTION_BACKEND_URL_KEY]: {
      type: 'string',
      title: 'Backend URL',
      description: 'NestJS backend URL (default: http://localhost:3001)',
      default: DEFAULT_BACKEND_URL
    }
  }
};

@injectable()
export class ForfictionAuthCommandContribution implements CommandContribution {

  @inject(PreferenceService)
  private readonly preferences: PreferenceService;

  registerCommands(registry: CommandRegistry): void {
    registry.registerCommand(FORFICTION_COMMANDS.SET_AUTH_TOKEN, {
      execute: () => {
        const token = window.prompt('Paste your Supabase anon key or auth token:');
        if (token && token.trim()) {
          this.preferences.set(FORFICTION_AUTH_TOKEN_KEY, token.trim());
          window.alert('✅ Auth token saved. Restart the chat to use it.');
        }
      }
    });

    registry.registerCommand(FORFICTION_COMMANDS.SET_BACKEND_URL, {
      execute: () => {
        const current = this.preferences.get(FORFICTION_BACKEND_URL_KEY, DEFAULT_BACKEND_URL);
        const url = window.prompt(`Backend URL (current: ${current}):`, current);
        if (url && url.trim()) {
          this.preferences.set(FORFICTION_BACKEND_URL_KEY, url.trim());
        }
      }
    });
  }
}

// Lazy import to avoid circular dependency
import { PreferenceService } from '@theia/core/lib/common/preferences';
