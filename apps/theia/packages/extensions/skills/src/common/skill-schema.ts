/**
 * forFiction Skill Definition — loaded from skill.yaml
 * 
 * Each skill.yaml defines:
 * - id, name, description
 * - capabilities (toggleable prompt fragments)
 * - prompts (system, user, tools)
 * - agents (which agents use this skill)
 */

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  
  /** Prompt fragments included when this skill is active */
  capabilities: SkillCapability[];
  
  /** System prompt for the Orchestrator when this skill is active */
  systemPrompt?: string;
  
  /** Default writing rules specific to this skill */
  rules?: string[];
  
  /** Which agents this skill influences */
  agents: ('orchestrator' | 'writer' | 'reviewer' | 'editor')[];
  
  /** Tools available when this skill is active */
  tools?: SkillTool[];
}

export interface SkillCapability {
  id: string;
  name: string;
  description: string;
  /** @default 'off' */
  default?: 'on' | 'off';
  /** Inline prompt content, or a reference to a .prompt file */
  prompt?: string;
  promptFile?: string;
}

export interface SkillTool {
  id: string;
  name: string;
  description: string;
  arguments?: Record<string, {
    type: 'string' | 'number' | 'boolean';
    description?: string;
    required?: boolean;
  }>;
}
