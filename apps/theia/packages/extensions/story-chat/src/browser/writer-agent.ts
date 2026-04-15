import { injectable } from '@theia/core/shared/inversify';
import { AbstractStreamParsingChatAgent, ChatRequestModel, MutableChatRequestModel } from '@theia/ai-chat';
import { LanguageModelRequirement } from '@theia/ai-core';

/**
 * Writer Agent — generates prose content for forFiction.
 * This agent is called by the Orchestrator via ~{write} tool.
 * Streams content chunks directly into the Monaco editor.
 */
@injectable()
export class ForfictionWriterAgent extends AbstractStreamParsingChatAgent {

  readonly id = 'forfiction.writer';
  readonly name = 'Writer';
  readonly description = 'Generates prose content following forFiction writing rules';

  languageModelRequirements: LanguageModelRequirement[] = [
    { purpose: 'chat', identifier: 'openai/gpt-4o-mini' }
  ];

  protected override systemPromptId = 'forfiction-writer-system-prompt';

  override async invoke(request: MutableChatRequestModel): Promise<void> {
    // Writer receives a writing task from Orchestrator
    // and streams content chunks to the editor
    await this.callLanguageModel(request, this.buildWriterPrompt(request), []);
  }

  private buildWriterPrompt(request: MutableChatRequestModel): string {
    const userMessage = request.request.text;
    
    return `You are the Writer agent for forFiction.

WRITING RULES (strictly enforced):
- NO "felt", "realized", "knew" for emotions
- NO AI-isms: "delve", "tapestry", "embark", "testament", "However,", "Furthermore,"
- Use sensory details over emotional explanations
- Limited third person POV, active voice
- Vary sentence length for rhythm
- Never explain emotions after dialogue

TASK: ${userMessage}

Write the content. Stream it in chunks. Use ~{write-to-editor} tool to insert each paragraph.`;
  }

  /**
   * Called by the Orchestrator to get the tool function schema.
   * The ~{write-to-editor} tool inserts text into the Monaco editor.
   */
  static getToolFunctions() {
    return [
      {
        name: 'write-to-editor',
        description: 'Insert text into the story editor at the current cursor position',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'The text content to insert' },
            position: { type: 'string', enum: ['cursor', 'end'], description: 'Where to insert', default: 'cursor' }
          },
          required: ['text']
        }
      },
      {
        name: 'end-chunk',
        description: 'Signal end of a streaming content chunk',
        parameters: {
          type: 'object',
          properties: {
            chunkId: { type: 'string', description: 'Chunk identifier for partial review' }
          },
          required: ['chunkId']
        }
      }
    ];
  }
}
