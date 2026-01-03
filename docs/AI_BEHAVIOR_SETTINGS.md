# AI Behavior Settings Documentation

## Overview

AI Behavior Settings allow users to customize how the AI summary is generated, including model parameters, tone, personalization, and context-aware intelligence.

## Settings Schema

### Category: `ai-behavior`

All settings are stored in the database with `category = 'ai-behavior'` and `id = 'ai-behavior.{settingName}'`.

## Setting Definitions

### Model & Output Parameters

#### `model`

- **Type:** `string`
- **Default:** `'anthropic/claude-3-haiku'`
- **Options:**
  - `anthropic/claude-3-haiku` - Fast, cost-effective ($0.25/1M tokens)
  - `anthropic/claude-3-5-sonnet` - Balanced quality ($3/1M tokens)
  - `anthropic/claude-3-opus` - Premium quality ($15/1M tokens)
  - `openai/gpt-4o` - OpenAI flagship
  - `openai/gpt-4o-mini` - OpenAI efficient
  - `google/gemini-1.5-flash` - Fast, multimodal
  - `google/gemini-1.5-pro` - Google premium
- **Description:** AI model to use for summary generation

#### `temperature`

- **Type:** `number`
- **Range:** `0-2`
- **Default:** `0.7`
- **Description:** Controls creativity vs consistency. Lower = more focused, higher = more creative

#### `maxTokens`

- **Type:** `number`
- **Range:** `50-300`
- **Default:** `150`
- **Description:** Maximum length of generated summary

#### `topP`

- **Type:** `number`
- **Range:** `0-1`
- **Default:** `1`
- **Description:** Nucleus sampling - alternative to temperature for controlling randomness

#### `presencePenalty`

- **Type:** `number`
- **Range:** `-2 to 2`
- **Default:** `0`
- **Description:** Encourages AI to talk about new topics

#### `frequencyPenalty`

- **Type:** `number`
- **Range:** `-2 to 2`
- **Default:** `1.5` (ALWAYS SET HIGH - not user-configurable)
- **Description:** Reduces repetitive phrasing (locked to prevent annoying repetition)

#### `verbosity`

- **Type:** `enum`
- **Options:** `'low'` | `'medium'` | `'high'`
- **Default:** `'medium'`
- **Description:** OpenRouter native parameter for output detail level
  - `low`: Brief, essential facts only
  - `medium`: Standard 2-3 sentences
  - `high`: Detailed, descriptive

---

### Tone & Personalization

#### `tone`

- **Type:** `enum`
- **Options:** `'formal'` | `'casual'`
- **Default:** `'casual'`
- **Description:** Overall communication style

#### `userNames`

- **Type:** `string[]`
- **Default:** `[]`
- **Description:** List of names the AI can use to address users. If empty, uses generic addressing.
- **Example:** `['Jack', 'Lauren']` → "Good morning, Jack and Lauren!"

#### `humorLevel`

- **Type:** `enum`
- **Options:** `'none'` | `'subtle'` | `'playful'`
- **Default:** `'subtle'`
- **Description:** Amount of playfulness in responses
  - `none`: Straightforward, serious
  - `subtle`: Light wordplay, gentle humor
  - `playful`: More jokes, fun comparisons

#### `customInstructions`

- **Type:** `string`
- **Default:** `''`
- **Max Length:** `500 characters`
- **Description:** Additional instructions appended to system prompt with reduced weight
- **Example:** "Always mention if it's a good day for cycling"

---

### Context-Aware Intelligence

#### `morningTone`

- **Type:** `string`
- **Default:** `'energizing'`
- **Description:** System prompt override for morning hours (5am-5pm)
- **Built-in Values:**
  - `energizing`: "Be energizing and action-focused"
  - `neutral`: No override
  - `custom`: User provides custom instructions

#### `eveningTone`

- **Type:** `string`
- **Default:** `'calming'`
- **Description:** System prompt override for evening hours (5pm-5am)
- **Built-in Values:**
  - `calming`: "Be reflective and calming"
  - `neutral`: No override
  - `custom`: User provides custom instructions

#### `stressAwareEnabled`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** When enabled, detects high-stress conditions and adjusts tone
- **Triggers:**
  - 5+ calendar events in a single day
  - Future: Negative news sentiment
- **Effect:** Reduces pressure language, adds encouragement

#### `celebrationModeEnabled`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Detects special occasions and uses upbeat tone
- **Current Detection:**
  - Weekends (Saturday/Sunday)
  - Future: Birthdays, holidays, custom dates

---

### Advanced Controls

#### `stopSequences`

- **Type:** `string[]`
- **Default:** `[]`
- **Max Items:** `10`
- **Description:** Phrases/words the AI should never generate
- **Example:** `['urgent', 'breaking news', 'crisis']`

---

## System Prompt Construction

The final system prompt is built from multiple components:

```typescript
function buildSystemPrompt(settings: AIBehaviorSettings, context: Context): string {
  const parts: string[] = [];

  // Base role (ALWAYS INCLUDED)
  parts.push('You are a helpful assistant for a smart mirror display.');

  // Verbosity instruction (from settings.verbosity)
  if (settings.verbosity === 'low') {
    parts.push('Be extremely brief - essential facts only.');
  } else if (settings.verbosity === 'high') {
    parts.push('Provide detailed, descriptive summaries.');
  } else {
    parts.push('Generate a brief, friendly daily briefing in 2-3 sentences.');
  }

  // Tone instruction (from settings.tone)
  if (settings.tone === 'formal') {
    parts.push('Use professional, formal language.');
  } else {
    parts.push('Be warm but concise.');
  }

  // Humor level (from settings.humorLevel)
  if (settings.humorLevel === 'playful') {
    parts.push('Add light humor and playful comparisons where appropriate.');
  } else if (settings.humorLevel === 'subtle') {
    parts.push('Use subtle wordplay occasionally.');
  }
  // none = no instruction

  // Time-based tone override
  const hour = new Date().getHours();
  const isMorning = hour >= 5 && hour < 17;

  if (isMorning && settings.morningTone === 'energizing') {
    parts.push('Be energizing and action-focused for the morning ahead.');
  } else if (!isMorning && settings.eveningTone === 'calming') {
    parts.push('Be reflective and calming for the evening.');
  }

  // Stress-aware mode
  if (settings.stressAwareEnabled && context.calendar.todayEvents.length >= 5) {
    parts.push('The user has a very busy day. Use encouraging language and avoid adding pressure.');
  }

  // Celebration mode
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
  if (settings.celebrationModeEnabled && isWeekend) {
    parts.push("It's the weekend - use an upbeat, celebratory tone!");
  }

  // User names
  if (settings.userNames.length > 0) {
    const names = settings.userNames.join(' and ');
    parts.push(`Address the user(s) by name: ${names}`);
  }

  // Custom instructions (appended with reduced priority)
  if (settings.customInstructions) {
    parts.push(`Additional context: ${settings.customInstructions}`);
  }

  // ALWAYS exclude emojis
  parts.push("Don't use emojis.");

  return parts.join(' ');
}
```

## Model Parameters Mapping

When calling OpenRouter API:

```typescript
{
  model: settings.model,
  temperature: settings.temperature,
  max_tokens: settings.maxTokens,
  top_p: settings.topP,
  presence_penalty: settings.presencePenalty,
  frequency_penalty: 1.5, // ALWAYS 1.5, not user-configurable
  stop: settings.stopSequences.length > 0 ? settings.stopSequences : undefined,
  // OpenRouter-specific
  verbosity: settings.verbosity, // 'low' | 'medium' | 'high'
}
```

## Default Settings

When no database settings exist, use these defaults:

```typescript
const DEFAULT_AI_BEHAVIOR: AIBehaviorSettings = {
  // Model Parameters
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

  // Context-Aware
  morningTone: 'energizing',
  eveningTone: 'calming',
  stressAwareEnabled: true,
  celebrationModeEnabled: true,

  // Advanced
  stopSequences: [],
};
```

## Admin UI Organization

Settings will be organized in sections:

1. **Model & Output**
   - Model dropdown
   - Temperature slider
   - Max tokens slider
   - Top-P slider
   - Presence penalty slider
   - Verbosity radio buttons

2. **Tone & Personalization**
   - Formal/Casual toggle
   - User names (editable list with add/remove)
   - Humor level radio buttons
   - Custom instructions textarea

3. **Smart Adjustments**
   - Time-based tone (morning/evening dropdowns)
   - Stress-aware toggle
   - Celebration mode toggle

4. **Advanced**
   - Stop sequences (textarea, comma-separated)

## Database Storage

Each setting is stored as:

- `id`: `'ai-behavior.{settingName}'`
- `category`: `'ai-behavior'`
- `value`: String representation (JSON for arrays/objects)

Example:

```sql
INSERT INTO Setting (id, category, value) VALUES
  ('ai-behavior.model', 'ai-behavior', 'anthropic/claude-3-haiku'),
  ('ai-behavior.temperature', 'ai-behavior', '0.7'),
  ('ai-behavior.tone', 'ai-behavior', 'casual'),
  ('ai-behavior.userNames', 'ai-behavior', '["Jack","Lauren"]');
```

## Testing Strategy

1. **Unit tests:** System prompt construction with various settings combinations
2. **Integration tests:** API route GET/PUT operations
3. **Live tests:** Generate summaries with different configurations
4. **Edge cases:**
   - Empty user names
   - Max/min slider values
   - Very long custom instructions (truncation)
   - Invalid model names (validation)

## Future Enhancements

- **Birthday/Holiday Calendar:** Expand celebration mode triggers
- **News Sentiment Analysis:** Stress-aware mode reacts to negative headlines
- **Per-User Profiles:** Different settings for different household members
- **Learning Mode:** Track which summaries get most interaction, adjust automatically
