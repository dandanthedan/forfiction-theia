import { injectable } from '@theia/core/shared/inversify';
import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core/lib/common';
import { OpenViewSymbol, OpenViewOptions, ChatContribution } from '@theia/ai-chat/lib/common/chat-view-contribution';
import { FORFICTION_COMMANDS } from './commands';
import { StoryChatWidget, StoryChatWidget_ID } from './story-chat-widget';

export const FORFICTION_CHAT_VIEW_ID = 'forfiction-chat-view';

@injectable()
export class ForfictionChatContribution extends ChatContribution {

  readonly id = FORFICTION_CHAT_VIEW_ID;
  readonly label = 'forFiction';

  override registerCommands(registry: CommandRegistry): void {
    super.registerCommands(registry);
    registry.registerCommand(FORFICTION_COMMANDS.OPEN_CHAT, {
      execute: () => this.openView({ reveal: true }),
    });
    registry.registerCommand(FORFICTION_COMMANDS.NEW_STORY, {
      execute: async () => {
        await this.openView({ reveal: true });
        // Trigger new story flow in widget
      },
    });
    registry.registerCommand(FORFICTION_COMMANDS.REVIEW_CURRENT, {
      execute: async () => {
        const widget = await this.widgetService.getWidgets(StoryChatWidget_ID).first();
        if (widget) {
          (widget as StoryChatWidget).triggerReview();
        }
      },
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
  }

  override createWidget(): StoryChatWidget {
    return this.container.get(StoryChatWidget);
  }

  /**
   * Returns the panel side where the chat view should open by default.
   * 'right' matches the original AIChatSidebar position.
   */
  override get openViewOptions(): OpenViewOptions & { side?: 'right' | 'left' | 'bottom' } {
    return {
      ...super.openViewOptions,
      side: 'right',
      area: 'secondary',
    };
  }
}
