import { inject, injectable } from '@theia/core/shared/inversify';
import { AIVariableContribution, AIVariableService, PromptService } from '@theia/ai-core';
import { SkillLoaderService } from '../backend/skill-loader.service';
import { SkillDefinition } from '../common/skill-schema';

/**
 * SkillTreeContribution — registers forFiction skills as Theia AI prompt
 * fragments, making them available as toggleable capability chips in the chat UI.
 * 
 * When a skill is loaded from skill.yaml, this contribution:
 * 1. Registers its system prompt as a PromptFragment
 * 2. Registers each capability as a toggleable prompt fragment
 * 3. Makes them available to the Orchestrator agent
 */
@injectable()
export class SkillTreeContribution implements AIVariableContribution {

  @inject(SkillLoaderService)
  private readonly skillLoader: SkillLoaderService;

  @inject(PromptService)
  private readonly promptService: PromptService;

  async registerVariables(service: AIVariableService): Promise<void> {
    const skills = await this.skillLoader.loadAllSkills();

    for (const skill of skills.values()) {
      await this.registerSkillAsPromptFragment(skill);
    }

    console.log(`[forFiction] Registered ${skills.size} skills as prompt fragments`);
  }

  private async registerSkillAsPromptFragment(skill: SkillDefinition): Promise<void> {
    // Register the skill's system prompt as a named prompt fragment
    if (skill.systemPrompt) {
      await this.promptService.addPromptFragment(`forfiction-skill-${skill.id}`, {
        id: `forfiction-skill-${skill.id}`,
        template: skill.systemPrompt,
        variables: []
      });
    }

    // Register each capability as a toggleable prompt fragment
    for (const capability of skill.capabilities) {
      await this.promptService.addPromptFragment(`forfiction-capability-${skill.id}-${capability.id}`, {
        id: `forfiction-capability-${skill.id}-${capability.id}`,
        template: capability.prompt || '',
        variables: [],
        // Theia AI will use frontmatter from the template to show chip in UI
        // In practice, you'd add frontmatter to the template string here
      });
    }
  }
}
