import { MonacoEditor } from '@theia/monaco/lib/browser/monaco-editor';
import { EditorWidget } from '@theia/editor/lib/browser/editor-widget';

/**
 * StreamingContentHandler — inserts streamed Writer agent output
 * into the Monaco editor in real-time via incremental edits.
 * 
 * The Writer agent sends SSE content_delta events:
 *   { type: 'content_delta', data: { content: 'chunk of text' } }
 * 
 * This handler accumulates chunks and inserts them via
 * editor.executeEdits() for smooth streaming without flicker.
 */
export class StreamingContentHandler {

  private editor: MonacoEditor | null = null;
  private currentModel: ReturnType<MonacoEditor['getModel']> | null = null;
  private pendingText = '';
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly FLUSH_INTERVAL_MS = 50; // flush every 50ms for smooth streaming

  /**
   * Attach to a Monaco editor instance.
   */
  attach(editor: MonacoEditor): void {
    this.editor = editor;
    this.currentModel = editor.getModel();
  }

  /**
   * Detach and flush any remaining content.
   */
  detach(): void {
    this.flush();
    this.editor = null;
    this.currentModel = null;
  }

  /**
   * Called when a content_delta SSE event arrives from the Writer agent.
   * Accumulates text and schedules a flush.
   */
  onContentChunk(chunk: string): void {
    this.pendingText += chunk;
    this.scheduleFlush();
  }

  /**
   * Called when the stream completes (content_complete event).
   */
  onStreamComplete(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
    this.flush();
  }

  /**
   * Called on error — inserts remaining content as plain text.
   */
  onStreamError(error: string): void {
    console.error('[forFiction] Stream error:', error);
    if (this.pendingText) {
      this.insertText(this.pendingText);
      this.pendingText = '';
    }
  }

  /**
   * Replace all editor content with finalized text.
   */
  setFinalContent(fullText: string): void {
    if (!this.editor || !this.currentModel) return;
    this.pendingText = '';
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    this.editor.getControl().executeEdits('forfiction-finalize', [{
      range: this.currentModel.getFullModelRange(),
      text: fullText
    }]);
  }

  private scheduleFlush(): void {
    if (this.flushTimeout) return;
    this.flushTimeout = setTimeout(() => {
      this.flushTimeout = null;
      this.flush();
    }, this.FLUSH_INTERVAL_MS);
  }

  private flush(): void {
    if (!this.pendingText || !this.editor || !this.currentModel) return;
    const text = this.pendingText;
    this.pendingText = '';

    if (!text.trim()) return;

    const position = this.currentModel.getFullModelRange().getEndPosition();
    this.insertTextAt(text, position);
  }

  private insertText(text: string): void {
    if (!this.editor || !this.currentModel) return;
    const position = this.currentModel.getFullModelRange().getEndPosition();
    this.insertTextAt(text, position);
  }

  private insertTextAt(text: string, position: monaco.IPosition): void {
    if (!this.editor || !this.currentModel) return;

    // Use executeEdits for Theia's undo history support
    this.editor.getControl().executeEdits('forfiction-stream', [
      {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        },
        text
      }
    ]);

    // Scroll to bottom
    this.editor.getControl().setScrollPosition({
      scrollTop: this.editor.getControl().getScrollHeight()
    });
  }
}
