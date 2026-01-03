/**
 * AI Behavior Settings Types and Defaults
 * Shared between admin API and summary generation
 */

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
