/**
 * AI Behavior Settings - Server-Only Functions
 * Database operations using Prisma (not safe for client components)
 */

import 'server-only';
import { prisma } from '@/lib/db';
import { DEFAULT_AI_BEHAVIOR, type AIBehaviorSettings } from './ai-behavior';

/**
 * Fetch AI Behavior Settings from Database
 * Server-only function - do not import in client components
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
