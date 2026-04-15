import { Widget, BaseWidget, Message, codicon, PreDestroyable } from '@theia/core/lib/browser';
import { inject, injectable } from '@theia/core/shared/inversify';
import { AIChatService } from '@theia/ai-chat/lib/common/ai-chat-service';
import { ChatModel } from '@theia/ai-chat/lib/common/chat-model';
import { ChatViewService } from '@theia/ai-chat/lib/common/chat-view-service';
import { ChatInputWidget } from '@theia/ai-chat/lib/browser/chat-input-widget';
import { NestJSSSEClient } from './nestjs-sse-client';
import { StreamingContentHandler } from '@forfiction/extension-story-editor/lib/browser/streaming-content-handler';

export const StoryChatWidget_ID = 'forfiction-story-chat';

@injectable()
export class StoryChatWidget extends BaseWidget implements ChatViewService, PreDestroyable {

  static readonly ID = StoryChatWidget_ID;
  static readonly LABEL = 'forFiction';

  @inject(AIChatService)
  private readonly chatService: AIChatService;

  @inject(ChatInputWidget)
  private readonly chatInput: ChatInputWidget;

  @inject(NestJSSSEClient)
  private readonly sseClient: NestJSSSEClient;

  private chatModel: ChatModel;
  private backendUrl: string = 'http://localhost:3001';
  private currentStoryId: string | undefined;
  private conversationId: string | undefined;
  private pendingText = '';
  private isStreaming = false;

  constructor() {
    super();
    this.id = StoryChatWidget.ID;
    this.title.label = 'forFiction';
    this.title.caption = 'forFiction Chat';
    this.title.iconClass = codicon('person');
    this.chatModel = this.chatService.createChatModel({ agentId: 'forfiction.orchestrator' });
    this.sseSetup();
  }

  private sseSetup(): void {
    this.sseClient.onContentDelta(delta => {
      this.pendingText += delta.content;
      this.appendToLastMessage(this.pendingText);
    });

    this.sseClient.onContentComplete(event => {
      this.appendToLastMessage(`\n\n---\n*${event.chapterTitle || 'Chapter complete'}*`);
      this.isStreaming = false;
    });

    this.sseClient.onAgentStep(step => {
      this.appendToLastMessage(`\n**[${step.agent}]** ${step.step}: ${step.detail}`);
    });

    this.sseClient.onDone(() => {
      this.isStreaming = false;
      this.chatInput.enable();
    });

    this.sseClient.onError(error => {
      this.appendToLastMessage(`\n\n⚠️ Error: ${error.message}`);
      this.isStreaming = false;
      this.chatInput.enable();
    });

    this.sseClient.onConversationId(({ conversationId }) => {
      this.conversationId = conversationId;
    });
  }

  @inject(StreamingContentHandler)
  private streamingHandler: StreamingContentHandler;

  async createNewChat(): Promise<void> {
    this.conversationId = undefined;
    this.chatModel.reset();
  }

  /**
   * Set the active story — call this when user opens a story.
   */
  setActiveStory(storyId: string): void {
    this.currentStoryId = storyId;
    this.pendingText = '';
  }

  /**
   * Trigger review of the currently open chapter.
   */
  triggerReview(): void {
    if (!this.currentStoryId) {
      this.appendSystemMessage('⚠️ No story open. Please open a story first.');
      return;
    }
    this.sendMessage('Review my current chapter', 'revise');
  }

  /**
   * Send a message to the NestJS backend via SSE.
   */
  async sendMessage(text: string, action: string = 'write'): Promise<void> {
    if (!this.currentStoryId) {
      this.appendSystemMessage('⚠️ No story open. Please open a story first.');
      return;
    }
    if (this.isStreaming) return;

    // Add user message to chat
    this.chatModel.addUserMessage(text);
    this.pendingText = '';
    this.isStreaming = true;
    this.chatInput.disable();

    // Add a placeholder assistant message
    const assistantMessage = this.chatModel.addAgentMessage({ content: '' });

    // Connect to NestJS SSE
    this.sseClient.connect(this.backendUrl, this.currentStoryId, {
      message: text,
      action,
      conversationId: this.conversationId,
      context: await this.buildContext(),
    });
  }

  async buildContext(): Promise<Record<string, unknown>> {
    // Gather current story context from the editor
    return {
      mode: 'draft',
      // Additional context would come from story-memory extension
    };
  }

  protected override onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.render();
  }

  private render(): void {
    this.node.className = 'forfiction-chat-widget theia-AIChat';
    this.node.innerHTML = `
      <div class="forfiction-header">
        <span class="forfiction-title">✍️ forFiction</span>
        <div class="forfiction-modes">
          <button class="mode-btn active" data-mode="draft">Draft</button>
          <button class="mode-btn" data-mode="revise">Revise</button>
        </div>
      </div>
      <div class="forfiction-messages" id="ff-messages"></div>
      <div class="forfiction-input-area"></div>
    `;

    // Mount chat input
    const inputArea = this.node.querySelector('.forfiction-input-area');
    if (inputArea) {
      this.chatInput.attachTo(inputArea);
      this.chatInput.setOnSubmit(msg => this.sendMessage(msg));
    }

    this.setupModeButtons();
  }

  private setupModeButtons(): void {
    this.node.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset['mode'];
        this.node.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  private appendToLastMessage(text: string): void {
    const messagesEl = this.node.querySelector('#ff-messages');
    if (!messagesEl) return;
    const last = messagesEl.querySelector('.ff-message:last-child');
    if (last) {
      last.innerHTML += text.replace(/\n/g, '<br>');
      last.scrollIntoView({ behavior: 'smooth' });
    }
  }

  appendSystemMessage(html: string): void {
    const messagesEl = this.node.querySelector('#ff-messages');
    if (!messagesEl) return;
    const div = document.createElement('div');
    div.className = 'ff-message ff-system';
    div.innerHTML = html;
    messagesEl.appendChild(div);
  }

  dispose(): void {
    this.sseClient.disconnect();
    this.chatModel.dispose();
    super.dispose();
  }

  get chatId(): string {
    return this.chatModel.id;
  }

  async setInput(value: string): Promise<void> {
    this.chatInput.setValue(value);
  }
}
