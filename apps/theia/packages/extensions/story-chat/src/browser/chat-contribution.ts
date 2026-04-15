import { injectable } from '@theia/core/shared/inversify';
import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core/lib/common';
import { PreferenceContribution } from '@theia/core/lib/common/preferences';
import { OpenViewOptions, ChatContribution } from '@theia/ai-chat/lib/common/chat-view-contribution';
import { FORFICTION_COMMANDS, ForfictionPreferencesContribution, ForfictionAuthCommandContribution } from './commands';
import { StoryChatWidget, StoryChatWidget_ID } from './story-chat-widget';

export const FORFICTION_CHAT_VIEW_ID = 'forfiction-chat-view';

@injectable()
export class ForfictionChatContribution extends ChatContribution
  implements CommandContribution, PreferenceContribution {

  readonly id = FORFICTION_CHAT_VIEW_ID;
  readonly label = 'forFiction';

  readonly schema = (ForfictionPreferencesContribution.prototype.schema as { id: string; title: string; type: string; properties: Record<string, unknown> });

  override registerCommands(registry: CommandRegistry): void {
    super.registerCommands(registry);
    registry.registerCommand(FORFICTION_COMMANDS.OPEN_CHAT, {
      execute: () => this.openView({ reveal: true }),
    });
    registry.registerCommand(FORFICTION_COMMANDS.NEW_STORY, {
      execute: async () => {
        await this.openView({ reveal: true });
      },
    });
    registry.registerCommand(FORFICTION_COMMANDS.REVIEW_CURRENT, {
      execute: async () => {
        const widgets = await this.widgetService.getWidgets(StoryChatWidget_ID);
        const widget = widgets[0] as StoryChatWidget | undefined;
        if (widget) {
          this.openView({ reveal: true });
          widget.triggerReview();
        }
      },
    });
    registry.registerCommand(FORFICTION_COMMANDS.SET_AUTH_TOKEN, {
      execute: async (registry: CommandRegistry) => {
        registry.executeCommand(FORFICTION_COMMANDS.SET_AUTH_TOKEN.id);
      }
    });
  }

  override registerMenus(menus: MenuModelRegistry): void {
    super.registerMenus(menus);
    menus.registerMenuAction('view', {
      commandId: FORFICTION_COMMANDS.OPEN_CHAT.id,
      label: 'Open forFiction Chat',
    });
    menus.registerMenuAction('editor/context', {
      commandId: FORFICTION_COMMANDS.REVIEW_CURRENT.id,
    });
    menus.registerMenuAction('forfictionMenu', {
      commandId: FORFICTION_COMMANDS.SET_AUTH_TOKEN.id,
      label: 'Set Auth Token',
    });
  }

  override createWidget(): StoryChatWidget {
    return this.container.get(StoryChatWidget);
  }

  override get openViewOptions(): OpenViewOptions & { side?: 'right' | 'left' | 'bottom' } {
    return {
      ...super.openViewOptions,
      side: 'right',
      area: 'secondary',
    };
  }
}
