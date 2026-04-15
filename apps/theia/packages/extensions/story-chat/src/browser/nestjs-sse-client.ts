import { injectable } from '@theia/core/shared/inversify';
import { EventEmitter } from '@theia/core';

export interface AgentStepEvent {
  agent: string;
  step: string;
  detail: string;
  status: 'running' | 'completed' | 'failed';
}

export interface ContentDeltaEvent {
  content: string;
}

export interface ContentCompleteEvent {
  fullContent: string;
  chapterTitle?: string;
  sources: string[];
}

export interface DoneEvent {
  tokensUsed: number;
}

export interface ErrorEvent {
  message: string;
  code?: string;
}

/**
 * NestJSSSEClient — typed EventSource client for the forFiction NestJS SSE endpoint.
 * 
 * Usage:
 *   const client = new NestJSSSEClient();
 *   client.connect('http://localhost:3001', storyId, { message: 'Write a chapter', token: '...' });
 *   client.onContentDelta(delta => appendText(delta.content));
 *   client.onDone(event => finish(event.tokensUsed));
 *   client.disconnect();
 */
@injectable()
export class NestJSSSEClient {

  private eventSource: EventSource | null = null;
  private url: string = '';

  readonly onAgentStep = new EventEmitter<AgentStepEvent>();
  readonly onContentDelta = new EventEmitter<ContentDeltaEvent>();
  readonly onContentComplete = new EventEmitter<ContentCompleteEvent>();
  readonly onConstraintViolations = new EventEmitter<unknown>();
  readonly onDone = new EventEmitter<DoneEvent>();
  readonly onError = new EventEmitter<ErrorEvent>();
  readonly onConversationId = new EventEmitter<{ conversationId: string }>();

  connect(
    backendUrl: string,
    storyId: string,
    params: {
      message: string;
      action?: string;
      context?: Record<string, unknown>;
      conversationId?: string;
      token?: string;
    }
  ): void {
    this.disconnect();

    const searchParams = new URLSearchParams({
      message: params.message,
      ...(params.action ? { action: params.action } : {}),
      ...(params.conversationId ? { conversationId: params.conversationId } : {}),
      ...(params.context ? { context: JSON.stringify(params.context) } : {}),
    });

    this.url = `${backendUrl}/api/v1/agent-chat/${storyId}/stream?${searchParams}`;
    this.eventSource = new EventSource(this.url);

    this.eventSource.addEventListener('agent_step', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        this.onAgentStep.fire(parsed.data as AgentStepEvent);
      } catch {}
    });

    this.eventSource.addEventListener('content_delta', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        this.onContentDelta.fire(parsed.data as ContentDeltaEvent);
      } catch {}
    });

    this.eventSource.addEventListener('content_complete', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        this.onContentComplete.fire(parsed.data as ContentCompleteEvent);
      } catch {}
    });

    this.eventSource.addEventListener('constraint_violations', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        this.onConstraintViolations.fire(parsed.data);
      } catch {}
    });

    this.eventSource.addEventListener('done', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        this.onDone.fire(parsed.data as DoneEvent);
      } catch {}
    });

    this.eventSource.addEventListener('error', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        this.onError.fire(parsed.data as ErrorEvent);
      } catch {
        this.onError.fire({ message: 'Connection failed' });
      }
    });

    this.eventSource.addEventListener('conversation_id', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        this.onConversationId.fire(parsed.data as { conversationId: string });
      } catch {}
    });
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  get isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }
}
