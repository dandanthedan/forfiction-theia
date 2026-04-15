import { injectable } from '@theia/core/shared/inversify';
import { PreferenceContribution, PreferenceSchema, PreferenceService } from '@theia/core/lib/common/preferences';

export const forfictionWritingRulesPreferenceSchema: PreferenceSchema = {
  id: 'forfiction.writing',
  title: 'forFiction Writing Rules',
  type: 'object',
  properties: {
    'forfiction.writing.showNotTell': {
      type: 'boolean',
      title: 'Enforce Show-Not-Tell',
      description: 'Warn when emotions are stated directly (felt, realized, knew)',
      default: true
    },
    'forfiction.writing.banAIISMs': {
      type: 'boolean',
      title: 'Ban AI-isms',
      description: 'Warn on banned words: delve, tapestry, embark, testament...',
      default: true
    },
    'forfiction.writing.adverbLimit': {
      type: 'number',
      title: 'Adverb Limit (per 3 paragraphs)',
      description: 'Maximum adverbs per 3 paragraphs (0 = unlimited)',
      default: 1
    },
    'forfiction.writing.pov': {
      type: 'string',
      title: 'Point of View',
      enum: ['third-person-limited', 'third-person-omniscient', 'first-person'],
      description: 'Enforce POV consistency',
      default: 'third-person-limited'
    },
    'forfiction.writing.activeVoice': {
      type: 'boolean',
      title: 'Active Voice Only',
      description: 'Warn on passive voice constructions',
      default: true
    }
  }
};

export const FORFICTION_PREFERENCES_ID = 'forfiction.writing';

@injectable()
export class ForfictionPreferencesContribution implements PreferenceContribution {
  
  readonly schema = forfictionWritingRulesPreferenceSchema;

  @inject(PreferenceService)
  private readonly preferenceService: PreferenceService;

  registerPreferences(): void {
    // Pre-populate with defaults if not set
    const defaults: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(this.schema.properties)) {
      if ('default' in prop) {
        defaults[key] = (prop as { default: unknown }).default;
      }
    }
    this.preferenceService.setDefault(FORFICTION_PREFERENCES_ID, defaults);
  }
}
