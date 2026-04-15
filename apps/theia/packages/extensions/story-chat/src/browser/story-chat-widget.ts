import { Widget, BaseWidget, Message, codicon, PreDestroyable, Disposable } from '@theia/core/lib/browser';
import { inject, injectable } from '@theia/core/shared/inversify';
import { AIChatService } from '@theia/ai-chat/lib/common/ai-chat-service';
import { ChatInputWidget } from '@theia/ai-chat/lib/browser/chat-input-widget';
import { NestJSSSEClient } from './nestjs-sse-client';
import { StoryContextService } from './story-context-service';
import { EditorManager } from '@theia/editor/lib/browser/editor-manager';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import { Emitter } from '@theia/core';

export const StoryChatWidget_ID = 'forfiction-story-chat';

/** Auth token storage key in Theia preferences */
const FORFICTION_AUTH_TOKEN_KEY = 'forfiction.authToken';
const FORFICTION_BACKEND_URL_KEY = 'forfiction.backendUrl';
const DEFAULT_BACKEND_URL = 'http://localhost:3001';

@injectable()
export class StoryChatWidget extends BaseWidget implements PreDestroyable {

  static readonly ID = StoryChatWidget_ID;
  static readonly LABEL = 'forFiction';

  @inject(AIChatService)
  private readonly chatService: AIChatService;

  @inject(ChatInputWidget)
  private readonly chatInput: ChatInputWidget;

  @inject(NestJSSSEClient)
  private readonly sseClient: NestJSSSEClient;

  @inject(StoryContextService)
  private readonly storyContext: StoryContextService;

  @inject(EditorManager)
  private readonly editorManager: EditorManager;

  @inject(PreferenceService)
  private readonly preferences: PreferenceService;

  private currentStoryId: string | undefined;
  private conversationId: string | undefined;
  private pendingText = '';
  private isStreaming = false;
  private activeMode = 'draft';
  private disposables: Disposable[] = [];

  private readonly onStoryChangedEmitter = new Emitter<string>();
  readonly onStoryChanged = this.onStoryChangedEmitter.event;

  constructor() {
    super();
    this.id = StoryChatWidget.ID;
    this.title.label = 'forFiction';
    this.title.caption = 'forFiction Chat';
    this.title.iconClass = codicon('edit');
    this.setupEditorListener();
  }

  /**
   * Listen to editor focus changes to auto-detect the active story.
   */
  private setupEditorListener(): void {
    // When the active editor changes, update the current story
    this.disposables.push(
      this.editorManager.onActiveEditorChanged(() => {
        this.updateActiveStory();
      })
    );

    // Also check on widget activation
    this.disposables.push(
      this.onActivate(() => {
        this.updateActiveStory();
      })
    );
  }

  private async updateActiveStory(): Promise<void> {
    const storyId = await this.storyContext.getActiveStoryId();
    if (storyId && storyId !== this.currentStoryId) {
      this.currentStoryId = storyId;
      const meta = await this.storyContext.getActiveStoryMetadata();
      this.onStoryChangedEmitter.fire(storyId);
      this.updateHeader(meta?.title || storyId);
    }
  }

  private updateHeader(storyTitle: string): void {
    const titleEl = this.node.querySelector('.forfiction-story-title');
    if (titleEl) titleEl.textContent = storyTitle;
  }

  protected override onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.render();
    this.updateActiveStory();
    this.sseSetup();
  }

  private sseSetup(): void {
    this.sseClient.onContentDelta(delta => {
      this.pendingText += delta.content;
      this.streamToEditor(this.pendingText);
    });

    this.sseClient.onContentComplete(event => {
      this.pendingText = '';
      this.streamToEditor(event.fullContent, true);
    });

    this.sseClient.onDone(() => {
      this.isStreaming = false;
      this.chatInput.enable();
    });

    this.sseClient.onError(error => {
      this.appendSystemMessage(`⚠️ ${error.message}`);
      this.isStreaming = false;
      this.chatInput.enable();
    });

    this.sseClient.onConversationId(({ conversationId }) => {
      this.conversationId = conversationId;
    });

    this.sseClient.onAgentStep(step => {
      const stepEl = this.node.querySelector('.forfiction-agent-step');
      if (stepEl) {
        stepEl.textContent = `[${step.agent}] ${step.detail || step.step}`;
        stepEl.className = `forfiction-agent-step ${step.status === 'completed' ? 'done' : 'running'}`;
      }
    });
  }

  /**
   * Send a message to the NestJS backend.
   */
  async sendMessage(text: string, action?: string): Promise<void> {
    // Auto-detect story from active editor
    if (!this.currentStoryId) {
      await this.updateActiveStory();
    }

    if (!this.currentStoryId) {
      this.appendSystemMessage('⚠️ No story open. Open a story file from the left panel first.');
      return;
    }
    if (this.isStreaming) return;

    this.isStreaming = true;
    this.chatInput.disable();
    this.pendingText = '';

    const mode = action || this.activeMode;
    const backendUrl = this.getBackendUrl();
    const token = this.getAuthToken();

    // Add user message to UI
    this.appendUserMessage(text);

    // Connect to NestJS SSE
    this.sseClient.connect(backendUrl, this.currentStoryId, {
      message: text,
      action: mode,
      conversationId: this.conversationId,
      context: await this.buildContext(),
      token: token || undefined,
    });
  }

  /**
   * Trigger review of the currently open chapter.
   */
  triggerReview(): void {
    if (!this.currentStoryId) {
      this.appendSystemMessage('⚠️ No story open. Open a chapter file first.');
      return;
    }
    this.sendMessage('Review and revise my current chapter.', 'revise');
  }

  private render(): void {
    this.node.className = 'forfiction-chat-widget';
    this.node.innerHTML = `
      <div class="forfiction-header">
        <div class="forfiction-header-top">
          <span class="forfiction-logo">✍️</span>
          <span class="forfiction-story-title">No story open</span>
        </div>
        <div class="forfiction-modes">
          <button class="mode-btn ${this.activeMode === 'draft' ? 'active' : ''}" data-mode="draft">Draft</button>
          <button class="mode-btn ${this.activeMode === 'revise' ? 'active' : ''}" data-mode="revise">Revise</button>
        </div>
        <div class="forfiction-agent-step" style="display:none"></div>
      </div>
      <div class="forfiction-messages" id="ff-messages"></div>
      <div class="forfiction-input-area" id="ff-input-area"></div>
    `;

    // Mount chat input
    const inputArea = this.node.querySelector('#ff-input-area') as HTMLElement;
    if (inputArea) {
      this.chatInput.attachTo(inputArea);
      this.chatInput.setOnSubmit(msg => this.sendMessage(msg));
      this.chatInput.setValue('');
    }

    this.setupModeButtons();
  }

  private setupModeButtons(): void {
    this.node.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset['mode'] || 'draft';
        this.activeMode = mode;
        this.node.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  private streamToEditor(text: string, complete: boolean = false): void {
    // Dispatch a custom event that StreamingContentHandler can listen to
    const event = new CustomEvent('forfiction:stream-content', {
      detail: { text, complete, storyId: this.currentStoryId },
      bubbles: true
    });
    this.node.dispatchEvent(event);
  }

  private appendUserMessage(text: string): void {
    const messagesEl = this.node.querySelector('#ff-messages');
    if (!messagesEl) return;
    const div = document.createElement('div');
    div.className = 'ff-message ff-user';
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  private appendSystemMessage(html: string): void {
    const messagesEl = this.node.querySelector('#ff-messages');
    if (!messagesEl) return;
    const div = document.createElement('div');
    div.className = 'ff-message ff-system';
    div.innerHTML = html;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  private async buildContext(): Promise<Record<string, unknown>> {
    return {
      mode: this.activeMode,
      conversationId: this.conversationId,
      // Future: pull from StoryMemoryService
      // chapterContent: await this.getCurrentChapterContent(),
    };
  }

  private getBackendUrl(): string {
    return this.preferences.get(FORFICTION_BACKEND_URL_KEY, DEFAULT_BACKEND_URL);
  }

  private getAuthToken(): string {
    return this.preferences.get(FORFICTION_AUTH_TOKEN_KEY, '');
  }

  /** Allow external code to set the auth token after login */
  setAuthToken(token: string): void {
    this.preferences.set(FORFICTION_AUTH_TOKEN_KEY, token);
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.sseClient.disconnect();
    super.dispose();
  }

  get chatId(): string {
    return this.id;
  }

  async setInput(value: string): Promise<void> {
    this.chatInput.setValue(value);
  }
}
