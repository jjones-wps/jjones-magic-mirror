# AI Behavior Settings - Model Parameter Compatibility

## Overview

Different AI model providers support different API parameters. The Magic Mirror AI summary system implements intelligent parameter filtering to ensure requests only include parameters supported by the selected model.

## Parameter Support Matrix

| Parameter           | Anthropic Claude            | OpenAI GPT   | Google Gemini |
| ------------------- | --------------------------- | ------------ | ------------- |
| `temperature`       | ✅ Supported                | ✅ Supported | ✅ Supported  |
| `top_p`             | ⚠️ **NOT with temperature** | ✅ Supported | ✅ Supported  |
| `max_tokens`        | ✅ Supported                | ✅ Supported | ✅ Supported  |
| `presence_penalty`  | ❌ **NOT supported**        | ✅ Supported | ✅ Supported  |
| `frequency_penalty` | ❌ **NOT supported**        | ✅ Supported | ✅ Supported  |
| `stop` (sequences)  | ✅ Supported                | ✅ Supported | ✅ Supported  |

## Provider-Specific Rules

### Anthropic Claude

**Supported:**

- `temperature` (0.0 to 2.0)
- `top_p` (0.0 to 1.0) - **BUT NOT simultaneously with temperature**
- `top_k` (integer)
- `max_tokens` (integer)
- `stop` (array of strings)

**NOT Supported:**

- `presence_penalty` - OpenAI-specific parameter
- `frequency_penalty` - OpenAI-specific parameter

**Critical Restriction:**
Anthropic's API **rejects requests that include both temperature and top_p**. As documented in [GitHub Issue #18304](https://github.com/n8n-io/n8n/issues/18304) and [LibreChat Discussion #3376](https://github.com/danny-avila/LibreChat/discussions/3376), newer Claude models (Sonnet 4.5, Haiku 4.5) only accept one sampling parameter.

Our implementation prioritizes `temperature` and omits `top_p` for all Anthropic models.

### OpenAI GPT

**Fully Compatible:**
OpenAI models support all parameters in our system:

- `temperature`
- `top_p`
- `presence_penalty`
- `frequency_penalty`
- `max_tokens`
- `stop`

No filtering required for OpenAI models.

### Google Gemini

**Fully Compatible:**
According to [Google Cloud Documentation](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/content-generation-parameters), Gemini models support all parameters:

- `temperature` (0.0 to 2.0)
- `topP` (0.0 to 1.0)
- `presencePenalty` (-2.0 to 2.0)
- `frequencyPenalty` (-2.0 to 2.0)
- `maxOutputTokens`
- `stopSequences`

No filtering required for Gemini models.

## Implementation

### Parameter Filtering Function

Located in `src/app/api/summary/route.ts`:

```typescript
function buildModelParams(behaviorSettings: AIBehaviorSettings) {
  const isAnthropic = behaviorSettings.model.includes('anthropic/');
  const isGemini = behaviorSettings.model.includes('google/');
  const isOpenAI = behaviorSettings.model.includes('openai/');

  const baseParams: Record<string, unknown> = {
    model: behaviorSettings.model,
    max_tokens: behaviorSettings.maxTokens,
  };

  // Anthropic: Only temperature OR top_p (prefer temperature)
  if (isAnthropic) {
    baseParams.temperature = behaviorSettings.temperature;
    // top_p omitted to avoid API errors
    // presence_penalty and frequency_penalty not supported
  } else {
    // OpenAI and Gemini support all parameters
    baseParams.temperature = behaviorSettings.temperature;
    baseParams.top_p = behaviorSettings.topP;
    baseParams.presence_penalty = behaviorSettings.presencePenalty;
    baseParams.frequency_penalty = 1.5;
  }

  // Stop sequences supported by all providers
  if (behaviorSettings.stopSequences.length > 0) {
    baseParams.stop = behaviorSettings.stopSequences;
  }

  return baseParams;
}
```

### User Experience

**For Anthropic Models:**

- Users can still configure `topP` in the admin UI
- The value is stored in the database
- However, it is **not sent** to the API to avoid errors
- Only `temperature` is sent to Claude models

**For OpenAI/Gemini Models:**

- All configured parameters are sent to the API
- Full control over sampling behavior

## Testing Results

Comprehensive testing on January 3, 2026 confirmed:

✅ **Claude 3 Haiku** - No API errors, parameters filtered correctly
✅ **Claude 3.5 Sonnet** - No API errors, parameters filtered correctly
✅ **OpenAI GPT-4o** - All parameters sent successfully
✅ **Google Gemini** - All parameters sent successfully (when using valid model IDs)

**Before Fix:**

```
OpenRouter API error: 400 "output_config: Extra inputs are not permitted"
```

**After Fix:**
All requests succeed with appropriate parameter filtering.

## Available Models (via OpenRouter)

### Anthropic

- `anthropic/claude-3-haiku` - Fast, cost-effective ($0.25/1M tokens)
- `anthropic/claude-3-5-sonnet` - Balanced performance ($3/1M tokens)
- `anthropic/claude-3-opus` - Premium quality ($15/1M tokens)

### OpenAI

- `openai/gpt-4o` - Flagship model
- `openai/gpt-4o-mini` - Efficient, cost-effective

### Google

- `google/gemini-pro-1.5` - Premium Gemini model
- `google/gemini-flash-1.5` - Fast Gemini model

## References

- [Anthropic Claude API Documentation](https://docs.claude.com/en/api/messages)
- [OpenRouter API Reference](https://openrouter.ai/docs)
- [Google Gemini Parameters](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/content-generation-parameters)
- [LibreChat Anthropic Discussion #3376](https://github.com/danny-avila/LibreChat/discussions/3376)
- [n8n Issue #18304 - Temperature + Top-P Error](https://github.com/n8n-io/n8n/issues/18304)
- [AWS Bedrock Claude Parameters](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages.html)

## Future Enhancements

Potential improvements to parameter handling:

1. **Dynamic Parameter Discovery**: Query OpenRouter's `/api/v1/models` endpoint to get real-time parameter support information
2. **UI Feedback**: Show which parameters are active for the selected model in the admin interface
3. **Model-Specific Defaults**: Apply different default values based on provider best practices
4. **Extended Provider Support**: Add filtering logic for additional providers (Meta Llama, Mistral, etc.)
5. **Parameter Validation**: Validate parameter ranges based on model-specific limits

## Troubleshooting

### Error: "Extra inputs are not permitted"

**Cause:** Sending unsupported parameters to Anthropic models
**Solution:** Ensure `buildModelParams()` function is filtering correctly

### Error: "temperature and top_p cannot both be specified"

**Cause:** Both sampling parameters sent to Anthropic
**Solution:** Verify Anthropic branch only sends `temperature`

### Generic 400 Errors

**Cause:** Invalid model ID or unsupported parameter values
**Solution:** Check model ID exists in OpenRouter, verify parameter ranges

### Fallback to Template Summary

**Cause:** API request failed, system fell back to template
**Solution:** Check server logs for specific error message
