/**
 * AI Behavior Settings - Server-Only Functions
 * Database operations using Prisma (not safe for client components)
 */

import 'server-only';
import { prisma } from '@/lib/db';
import { DEFAULT_AI_BEHAVIOR, type AIBehaviorSettings } from './ai-behavior';

// In-memory cache for AI behavior settings
let cachedSettings: AIBehaviorSettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch AI Behavior Settings from Database with Caching
 * Server-only function - do not import in client components
 *
 * Caches settings for 5 minutes to reduce database load.
 * Summary generation calls this every 30s (production) or 2 min (dev),
 * resulting in ~95% reduction in DB queries (120/hour → ~6/hour).
 *
 * @param bypassCache - Set to true to force fresh database fetch
 * @returns AIBehaviorSettings object with database values or defaults
 */
export async function fetchAIBehaviorSettings(
  bypassCache: boolean = false
): Promise<AIBehaviorSettings> {
  const now = Date.now();

  // Return cached settings if valid and not bypassed
  if (!bypassCache && cachedSettings && now - cacheTimestamp < CACHE_TTL) {
    return cachedSettings;
  }

  // Fetch from database
  const settings = await prisma.setting.findMany({
    where: { category: 'ai-behavior' },
  });

  // If no settings exist, cache and return defaults
  if (settings.length === 0) {
    cachedSettings = DEFAULT_AI_BEHAVIOR;
    cacheTimestamp = now;
    return DEFAULT_AI_BEHAVIOR;
  }

  // Transform database settings into typed object
  const settingsMap: Record<string, string> = {};
  settings.forEach((setting) => {
    const key = setting.id.replace('ai-behavior.', '');
    settingsMap[key] = setting.value;
  });

  // Build response with type coercion and hardened JSON.parse
  const result: AIBehaviorSettings = {
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

  // Update cache before returning
  cachedSettings = result;
  cacheTimestamp = now;

  return result;
}

/**
 * Invalidate AI Behavior Settings Cache
 * Call this after updating settings to ensure fresh data on next fetch
 */
export function invalidateAIBehaviorCache(): void {
  cachedSettings = null;
  cacheTimestamp = 0;
}
