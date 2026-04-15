import { Command } from '@theia/core/lib/common/command';

export const FORFICTION_COMMANDS = {
  // Opens the story chat sidebar panel
  OPEN_CHAT: Command.toLocalizedCommand(
    {
      id: 'forfiction.chat.open',
      label: 'forFiction: Open Chat',
    },
    {
      category: 'forFiction',
      label: 'Open Chat',
    }
  ),
  // Starts a new story writing session
  NEW_STORY: Command.toLocalizedCommand(
    {
      id: 'forfiction.story.new',
      label: 'forFiction: New Story',
    },
    {
      category: 'forFiction',
      label: 'New Story',
    }
  ),
  // Streams current editor content to the Orchestrator for review
  REVIEW_CURRENT: Command.toLocalizedCommand(
    {
      id: 'forfiction.story.review',
      label: 'forFiction: Review Current Chapter',
    },
    {
      category: 'forFiction',
      label: 'Review Current Chapter',
    }
  ),
};
