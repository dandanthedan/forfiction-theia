import { MonacoEditor } from '@theia/monaco/lib/browser/monaco-editor';
import { EditorManager } from '@theia/editor/lib/browser/editor-manager';
import { inject, injectable } from '@theia/core/shared/inversify';
import { Disposable } from '@theia/core';

/**
 * StreamingContentHandler — inserts streamed Writer agent output
 * into the Monaco editor in real-time.
 *
 * Receives content via:
 * 1. Direct method call: `handler.onContentChunk(text)`
 * 2. Custom DOM event: `window.addEventListener('forfiction:stream-content', ...)`
 *
 * The event approach is used by StoryChatWidget when streaming from the NestJS SSE.
 */
@injectable()
export class StreamingContentHandler {

  @inject(EditorManager)
  private readonly editorManager: EditorManager;

  private editor: MonacoEditor | null = null;
  private currentModel: ReturnType<MonacoEditor['getModel']> | null = null;
  private pendingText = '';
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly FLUSH_INTERVAL_MS = 50;
  private disposables: Disposable[] = [];

  constructor() {
    this.setupGlobalListener();
  }

  /**
   * Attach to the currently active Monaco editor.
   */
  attach(editor: MonacoEditor): void {
    this.detach();
    this.editor = editor;
    this.currentModel = editor.getModel();
    this.pendingText = '';
  }

  /**
   * Detach from current editor.
   */
  detach(): void {
    this.flush();
    this.editor = null;
    this.currentModel = null;
  }

  /**
   * Listen for forfiction:stream-content events from the chat widget.
   * This is how the chat widget streams content to the editor.
   */
  private setupGlobalListener(): void {
    const listener = (event: Event) => {
      const e = event as CustomEvent<{ text: string; complete: boolean; storyId?: string }>;
      if (e.detail.complete) {
        this.onStreamComplete(e.detail.text);
      } else {
        this.onContentChunk(e.detail.text);
      }
    };
    window.addEventListener('forfiction:stream-content', listener);
    this.disposables.push({
      dispose: () => window.removeEventListener('forfiction:stream-content', listener)
    } as Disposable);
  }

  onContentChunk(chunk: string): void {
    // Auto-attach to active editor if not yet attached
    if (!this.editor) {
      const active = this.editorManager.activeEditor;
      if (active) {
        const monacoEditor = MonacoEditor.get(active);
        if (monacoEditor) this.attach(monacoEditor);
      }
    }

    this.pendingText += chunk;
    this.scheduleFlush();
  }

  onStreamComplete(fullText?: string): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    if (fullText !== undefined) {
      // Final content — replace everything
      this.pendingText = '';
      this.setFinalContent(fullText);
    } else {
      this.flush();
    }
  }

  setFinalContent(fullText: string): void {
    if (!this.editor || !this.currentModel) return;

    this.editor.getControl().executeEdits('forfiction-finalize', [{
      range: this.currentModel.getFullModelRange(),
      text: fullText
    }]);

    this.scrollToBottom();
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
    this.scrollToBottom();
  }

  private insertTextAt(text: string, position: monaco.IPosition): void {
    if (!this.editor || !this.currentModel) return;

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
  }

  private scrollToBottom(): void {
    if (!this.editor) return;
    try {
      const scrollHeight = this.editor.getControl().getScrollHeight();
      this.editor.getControl().setScrollPosition({ scrollTop: scrollHeight });
    } catch {}
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.detach();
  }
}
