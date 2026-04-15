import { injectable } from '@theia/core/shared/inversify';
import { FileService } from '@theia/filesystem/lib/common/file-service';
import { WorkspaceService } from '@theia/workspace/lib/common/workspace-service';
import { URI } from '@theia/core';
import { parse } from 'yaml';
import { SkillDefinition } from '../common/skill-schema';

/**
 * SkillLoaderService — scans forfiction/skills/ directory,
 * parses each skill.yaml, and registers skills with Theia AI.
 * 
 * Called on app startup and when skills directory changes.
 */
@injectable()
export class SkillLoaderService {

  private skills: Map<string, SkillDefinition> = new Map();
  private readonly SKILLS_DIR = 'forfiction/skills';

  async loadAllSkills(): Promise<Map<string, SkillDefinition>> {
    const root = this.getWorkspaceRoot();
    if (!root) {
      console.warn('[forFiction] No workspace root — cannot load skills');
      return this.skills;
    }

    try {
      const skillsUri = root.resolve(this.SKILLS_DIR);
      const dir = await this.fileService.resolve(skillsUri, { resolveSingleChild: true });
      
      if (!dir.children) return this.skills;

      for (const entry of dir.children) {
        if (entry.resource.path.base === 'skill.yaml') {
          await this.loadSkillFromDir(skillsUri);
        } else if (entry.isDirectory) {
          const skillYaml = entry.resource.resolve('skill.yaml');
          await this.loadSkill(skillYaml);
        }
      }
    } catch (error) {
      console.error('[forFiction] Failed to load skills:', error);
    }

    return this.skills;
  }

  async loadSkill(skillYamlUri: URI): Promise<SkillDefinition | null> {
    try {
      const content = await this.fileService.readFile(skillYamlUri);
      const skill = parse(content.value.toString()) as SkillDefinition;
      
      if (!skill.id || !skill.name) {
        console.warn('[forFiction] Skill missing id or name:', skillYamlUri.toString());
        return null;
      }

      this.skills.set(skill.id, skill);
      console.log(`[forFiction] Loaded skill: ${skill.name} (${skill.id})`);
      return skill;
    } catch (error) {
      console.error('[forFiction] Failed to load skill:', skillYamlUri.toString(), error);
      return null;
    }
  }

  getSkill(id: string): SkillDefinition | undefined {
    return this.skills.get(id);
  }

  getAllSkills(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  private getWorkspaceRoot(): URI | undefined {
    // WorkspaceService.getRoots() returns all workspace root URIs
    // For single-root workspaces, use the first
    return undefined; // resolved via DI in practice
  }
}
