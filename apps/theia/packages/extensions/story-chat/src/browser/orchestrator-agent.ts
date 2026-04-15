import { AbstractStreamParsingChatAgent, ChatRequestModel, ChatResponsePart, MutableChatRequestModel } from '@theia/ai-chat';
import { LanguageModelRequirement } from '@theia/ai-core';
import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { EventEmitter } from '@theia/core';
import { StoryMemoryService } from '@forfiction/extension-story-memory/lib/backend/story-memory-service';

// Writing rules enforced by the backend
const WRITING_RULES = `
SHOW-NOT-TELL: Never use "felt", "realized", "knew" for emotions.
AVOID AI-ISMS: Ban: delve, tapestry, embark, testament, However, Furthermore, Moreover.
POV: Limited third person, active voice, vary sentence length.
`;

/**
 * ForfictionOrchestratorAgent — bridges Theia AI chat to the NestJS SSE pipeline.
 * 
 * Instead of calling an LLM directly, this agent sends the user's message
 * to the NestJS backend SSE endpoint and streams the response back to the
 * Theia AI chat UI.
 * 
 * SSE events handled:
 *   agent_step    → chat response part (agent step indicator)
 *   content_delta → chat response part (text chunk)
 *   done          → completion
 *   error         → error response
 */
@injectable()
export class ForfictionOrchestratorAgent extends AbstractStreamParsingChatAgent {

  readonly id = 'forfiction.orchestrator';
  readonly name = 'Orchestrator';
  readonly description = 'Coordinates the forFiction writing pipeline via NestJS backend';

  modes = [
    { id: 'draft', name: 'Draft Mode' },
    { id: 'revise', name: 'Revision Mode' }
  ];

  // We still declare LLM requirements (satisfies Theia AI's interface)
  // but we override callLanguageModel to use NestJS instead
  languageModelRequirements: LanguageModelRequirement[] = [
    { purpose: 'chat', identifier: 'nestjs/backend' }
  ];

  @inject(ILogger)
  private readonly logger: ILogger;

  protected override systemPromptId = 'forfiction-orchestrator-system-prompt';

  /**
   * Override — intercept the LLM call and route to NestJS SSE instead.
   * Called by AbstractStreamParsingChatAgent.invoke() after building the prompt.
   */
  protected override async callLanguageModel(
    request: MutableChatRequestModel,
    prompt: string,
    _variables: Record<string, unknown>
  ): Promise<void> {
    // Extract the user's message from the request
    const userMessage = request.request.text;
    const mode = request.request.modeId || 'draft';
    const storyId = await this.resolveCurrentStoryId();

    if (!storyId) {
      request.pushError('No story is currently open. Please open a story first.');
      return;
    }

    try {
      // Connect to NestJS SSE endpoint
      await this.streamFromNestJS(request, storyId, userMessage, mode);
    } catch (error) {
      this.logger.error('[Orchestrator] NestJS SSE error:', error);
      request.pushError(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Connects to NestJS SSE and streams events back to the Theia AI request model.
   */
  private async streamFromNestJS(
    request: MutableChatRequestModel,
    storyId: string,
    message: string,
    mode: string
  ): Promise<void> {
    // Get auth token from Theia's auth service
    const token = await this.getAuthToken();
    
    // Build SSE URL
    const params = new URLSearchParams({
      message,
      action: mode === 'revise' ? 'revise' : 'write',
      context: JSON.stringify(await this.buildContext())
    });
    
    const url = `${this.getBackendUrl()}/api/v1/agent-chat/${storyId}/stream?${params}`;
    
    // Use EventSource with polling fallback for SSE
    // Note: EventSource doesn't support custom headers (auth),
    // so we pass token as a query param in dev, or via cookie in prod
    const eventSource = new EventSource(url);

    return new Promise((resolve, reject) => {
      eventSource.addEventListener('agent_step', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          // Emit agent step as a Theia AI response part
          const part: ChatResponsePart = {
            kind: 'text',
            text: `**[${data.data.agent}]** ${data.data.step}: ${data.data.detail}`
          };
          request.pushResponsePart(part);
        } catch {}
      });

      eventSource.addEventListener('content_delta', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          const part: ChatResponsePart = {
            kind: 'text',
            text: data.data.content
          };
          request.pushResponsePart(part);
        } catch {}
      });

      eventSource.addEventListener('content_complete', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          const part: ChatResponsePart = {
            kind: 'text',
            text: `\n\n---\n*Chapter: ${data.data.chapterTitle || 'Untitled'}*`
          };
          request.pushResponsePart(part);
        } catch {}
      });

      eventSource.addEventListener('done', () => {
        eventSource.close();
        resolve();
      });

      eventSource.addEventListener('error', (e: MessageEvent) => {
        eventSource.close();
        try {
          const errorData = JSON.parse(e.data);
          request.pushError(errorData.data?.message || 'Unknown error');
        } catch {
          request.pushError('Connection to writing server failed.');
        }
        reject(new Error('SSE error'));
      });
    });
  }

  private async resolveCurrentStoryId(): Promise<string | undefined> {
    // In a full implementation, this would look at the active editor
    // to determine the current story ID from the file path.
    // For now, we return undefined and show an error.
    return undefined;
  }

  private async buildContext(): Promise<Record<string, unknown>> {
    try {
      const storyMemory = this.container.get(StoryMemoryService);
      const context = await storyMemory.buildStoryContextString();
      return { storyContext: context };
    } catch {
      return {};
    }
  }

  private getBackendUrl(): string {
    // Configurable backend URL — defaults to localhost in dev
    // In production this would come from Theia's env or preference
    return process.env['FORFICTION_BACKEND_URL'] || 'http://localhost:3001';
  }

  private async getAuthToken(): Promise<string> {
    // In full implementation, retrieve Supabase token from Theia's auth service
    return '';
  }
}
