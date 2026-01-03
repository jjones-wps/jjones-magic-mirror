/**
 * AI Behavior Settings Types and Defaults
 * Shared between admin API and summary generation
 */

import { prisma } from '@/lib/db';

export interface AIBehaviorSettings {
  // Model & Output Parameters
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  presencePenalty: number;
  verbosity: 'low' | 'medium' | 'high';

  // Tone & Personalization
  tone: 'formal' | 'casual';
  userNames: string[];
  humorLevel: 'none' | 'subtle' | 'playful';
  customInstructions: string;

  // Context-Aware Intelligence
  morningTone: 'energizing' | 'neutral' | 'custom';
  eveningTone: 'calming' | 'neutral' | 'custom';
  stressAwareEnabled: boolean;
  celebrationModeEnabled: boolean;

  // Advanced Controls
  stopSequences: string[];
}

export const DEFAULT_AI_BEHAVIOR: AIBehaviorSettings = {
  // Model & Output Parameters
  model: 'anthropic/claude-3-haiku',
  temperature: 0.7,
  maxTokens: 150,
  topP: 1,
  presencePenalty: 0,
  verbosity: 'medium',

  // Tone & Personalization
  tone: 'casual',
  userNames: [],
  humorLevel: 'subtle',
  customInstructions: '',

  // Context-Aware Intelligence
  morningTone: 'energizing',
  eveningTone: 'calming',
  stressAwareEnabled: true,
  celebrationModeEnabled: true,

  // Advanced Controls
  stopSequences: [],
};

/**
 * Fetch AI Behavior Settings from Database
 * Shared between admin API and summary generation
 * @returns AIBehaviorSettings object with database values or defaults
 */
export async function fetchAIBehaviorSettings(): Promise<AIBehaviorSettings> {
  const settings = await prisma.setting.findMany({
    where: { category: 'ai-behavior' },
  });

  // If no settings exist, return defaults
  if (settings.length === 0) {
    return DEFAULT_AI_BEHAVIOR;
  }

  // Transform database settings into typed object
  const settingsMap: Record<string, string> = {};
  settings.forEach((setting) => {
    const key = setting.id.replace('ai-behavior.', '');
    settingsMap[key] = setting.value;
  });

  // Build response with type coercion and hardened JSON.parse
  return {
    // Model & Output Parameters
    model: settingsMap.model || DEFAULT_AI_BEHAVIOR.model,
    temperature: parseFloat(settingsMap.temperature || String(DEFAULT_AI_BEHAVIOR.temperature)),
    maxTokens: parseInt(settingsMap.maxTokens || String(DEFAULT_AI_BEHAVIOR.maxTokens), 10),
    topP: parseFloat(settingsMap.topP || String(DEFAULT_AI_BEHAVIOR.topP)),
    presencePenalty: parseFloat(
      settingsMap.presencePenalty || String(DEFAULT_AI_BEHAVIOR.presencePenalty)
    ),
    verbosity:
      (settingsMap.verbosity as 'low' | 'medium' | 'high') || DEFAULT_AI_BEHAVIOR.verbosity,

    // Tone & Personalization
    tone: (settingsMap.tone as 'formal' | 'casual') || DEFAULT_AI_BEHAVIOR.tone,
    userNames:
      settingsMap.userNames && settingsMap.userNames !== ''
        ? JSON.parse(settingsMap.userNames)
        : [],
    humorLevel:
      (settingsMap.humorLevel as 'none' | 'subtle' | 'playful') || DEFAULT_AI_BEHAVIOR.humorLevel,
    customInstructions: settingsMap.customInstructions || '',

    // Context-Aware Intelligence
    morningTone:
      (settingsMap.morningTone as 'energizing' | 'neutral' | 'custom') ||
      DEFAULT_AI_BEHAVIOR.morningTone,
    eveningTone:
      (settingsMap.eveningTone as 'calming' | 'neutral' | 'custom') ||
      DEFAULT_AI_BEHAVIOR.eveningTone,
    stressAwareEnabled: settingsMap.stressAwareEnabled
      ? settingsMap.stressAwareEnabled === 'true'
      : DEFAULT_AI_BEHAVIOR.stressAwareEnabled,
    celebrationModeEnabled: settingsMap.celebrationModeEnabled
      ? settingsMap.celebrationModeEnabled === 'true'
      : DEFAULT_AI_BEHAVIOR.celebrationModeEnabled,

    // Advanced Controls
    stopSequences:
      settingsMap.stopSequences && settingsMap.stopSequences !== ''
        ? JSON.parse(settingsMap.stopSequences)
        : [],
  };
}
