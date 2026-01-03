'use client';

/**
 * AI Behavior Settings Admin Page
 *
 * Configure AI model parameters, tone, personalization, and context-aware
 * features for the daily summary generation.
 */

import { useState, useEffect, useCallback } from 'react';
import type { AIBehaviorSettings } from '@/lib/ai-behavior';
import { DEFAULT_AI_BEHAVIOR } from '@/lib/ai-behavior';
import { useToast, ToastContainer } from '@/components/admin/Toast';

export default function AIBehaviorSettingsPage() {
  const [settings, setSettings] = useState<AIBehaviorSettings>(DEFAULT_AI_BEHAVIOR);
  const [originalSettings, setOriginalSettings] = useState<AIBehaviorSettings>(DEFAULT_AI_BEHAVIOR);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toasts, closeToast, success, error } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/ai-behavior');
        if (!response.ok) {
          if (response.status === 404) {
            setSettings(DEFAULT_AI_BEHAVIOR);
            setOriginalSettings(DEFAULT_AI_BEHAVIOR);
            return;
          }
          throw new Error('Failed to fetch AI behavior settings');
        }
        const data = await response.json();
        setSettings(data);
        setOriginalSettings(data);
      } catch (err) {
        error('Failed to load settings', err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only fetch once on mount

  const hasUnsavedChanges = () => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await fetch('/api/admin/ai-behavior', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setOriginalSettings(settings);
      success('Settings saved', 'AI behavior settings updated successfully');
    } catch (err) {
      error('Failed to save settings', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
  };

  // Check if Anthropic model is selected (topP and presencePenalty not supported)
  const isAnthropic = settings.model.includes('anthropic/');

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">AI Behavior Settings</h1>
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">AI Behavior Settings</h1>

      {/* Info Banner */}
      <div
        style={{
          background: 'var(--admin-info-muted)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-md)',
          marginBottom: 'var(--space-xl)',
          color: 'var(--admin-info)',
          fontSize: '0.875rem',
          lineHeight: '1.6',
        }}
      >
        <strong>ℹ️ Smart Parameter Filtering:</strong> Different AI models support different
        parameters. The system automatically filters requests based on your selected model —
        Anthropic models receive only temperature (no top_p or penalties), while OpenAI and Gemini
        receive all parameters.
      </div>

      {/* Model & Output Parameters */}
      <section className="settings-section">
        <h2 className="section-title">Model & Output Parameters</h2>
        <p className="section-description">
          Configure which AI model to use and control output characteristics
        </p>

        <div className="form-grid">
          {/* Model Selector */}
          <div className="form-field">
            <label className="form-label">AI Model</label>
            <select
              className="form-select"
              aria-label="AI Model"
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            >
              <optgroup label="Anthropic (Claude)">
                <option value="anthropic/claude-3-haiku">Claude 3 Haiku (Fast, $0.25/1M)</option>
                <option value="anthropic/claude-3-5-sonnet">
                  Claude 3.5 Sonnet (Balanced, $3/1M)
                </option>
                <option value="anthropic/claude-3-opus">Claude 3 Opus (Premium, $15/1M)</option>
              </optgroup>
              <optgroup label="OpenAI">
                <option value="openai/gpt-4o">GPT-4o (Flagship)</option>
                <option value="openai/gpt-4o-mini">GPT-4o Mini (Efficient)</option>
              </optgroup>
              <optgroup label="Google (via OpenRouter)">
                <option value="google/gemini-pro-1.5">Gemini Pro 1.5</option>
                <option value="google/gemini-flash-1.5">Gemini Flash 1.5</option>
              </optgroup>
            </select>
            <p className="form-hint">
              Balance speed, quality, and cost. Haiku recommended for daily summaries.
            </p>
          </div>

          {/* Temperature */}
          <div className="form-field">
            <label className="form-label">Temperature: {settings.temperature.toFixed(2)}</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              aria-label="Temperature"
              onChange={(e) =>
                setSettings({ ...settings, temperature: parseFloat(e.target.value) })
              }
              className="form-slider"
            />
            <p className="form-hint">
              Controls creativity. Lower = more focused, higher = more creative
            </p>
          </div>

          {/* Max Tokens */}
          <div className="form-field">
            <label className="form-label">Max Tokens: {settings.maxTokens}</label>
            <input
              type="range"
              min="50"
              max="300"
              step="10"
              value={settings.maxTokens}
              aria-label="Max Tokens"
              onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })}
              className="form-slider"
            />
            <p className="form-hint">Maximum length of generated summary (50-300 tokens)</p>
          </div>

          {/* Top-P */}
          <div className="form-field">
            <label className="form-label">
              Top-P: {settings.topP.toFixed(2)}
              {isAnthropic && (
                <span className="badge badge-warning ml-2">Not supported by Claude models</span>
              )}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.topP}
              onChange={(e) => setSettings({ ...settings, topP: parseFloat(e.target.value) })}
              className="form-slider"
              disabled={isAnthropic}
              style={{
                opacity: isAnthropic ? 0.5 : 1,
                cursor: isAnthropic ? 'not-allowed' : 'pointer',
              }}
            />
            <p className="form-hint">
              {isAnthropic
                ? 'Claude models use temperature instead of top-p for sampling control'
                : 'Nucleus sampling - alternative to temperature'}
            </p>
          </div>

          {/* Presence Penalty */}
          <div className="form-field">
            <label className="form-label">
              Presence Penalty: {settings.presencePenalty.toFixed(1)}
              {isAnthropic && (
                <span className="badge badge-warning ml-2">Not supported by Claude models</span>
              )}
            </label>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={settings.presencePenalty}
              onChange={(e) =>
                setSettings({ ...settings, presencePenalty: parseFloat(e.target.value) })
              }
              className="form-slider"
              disabled={isAnthropic}
              style={{
                opacity: isAnthropic ? 0.5 : 1,
                cursor: isAnthropic ? 'not-allowed' : 'pointer',
              }}
            />
            <p className="form-hint">
              {isAnthropic
                ? 'Claude models do not support presence/frequency penalties'
                : 'Encourages AI to talk about new topics'}
            </p>
          </div>

          {/* Verbosity */}
          <div className="form-field">
            <label className="form-label">Verbosity Level</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="verbosity"
                  value="low"
                  checked={settings.verbosity === 'low'}
                  onChange={() => setSettings({ ...settings, verbosity: 'low' })}
                />
                <span>Low - Essential facts only</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="verbosity"
                  value="medium"
                  checked={settings.verbosity === 'medium'}
                  onChange={() => setSettings({ ...settings, verbosity: 'medium' })}
                />
                <span>Medium - 2-3 sentences (recommended)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="verbosity"
                  value="high"
                  checked={settings.verbosity === 'high'}
                  onChange={() => setSettings({ ...settings, verbosity: 'high' })}
                />
                <span>High - Detailed, descriptive</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Tone & Personalization */}
      <section className="settings-section">
        <h2 className="section-title">Tone & Personalization</h2>
        <p className="section-description">
          Customize the AI&apos;s communication style and personality
        </p>

        <div className="form-grid">
          {/* Tone */}
          <div className="form-field">
            <label className="form-label">Communication Tone</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="tone"
                  value="formal"
                  checked={settings.tone === 'formal'}
                  onChange={() => setSettings({ ...settings, tone: 'formal' })}
                />
                <span>Formal - Professional language</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="tone"
                  value="casual"
                  checked={settings.tone === 'casual'}
                  onChange={() => setSettings({ ...settings, tone: 'casual' })}
                />
                <span>Casual - Warm and conversational (recommended)</span>
              </label>
            </div>
          </div>

          {/* Humor Level */}
          <div className="form-field">
            <label className="form-label">Humor Level</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="humorLevel"
                  value="none"
                  checked={settings.humorLevel === 'none'}
                  onChange={() => setSettings({ ...settings, humorLevel: 'none' })}
                />
                <span>None - Straightforward, serious</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="humorLevel"
                  value="subtle"
                  checked={settings.humorLevel === 'subtle'}
                  onChange={() => setSettings({ ...settings, humorLevel: 'subtle' })}
                />
                <span>Subtle - Light wordplay (recommended)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="humorLevel"
                  value="playful"
                  checked={settings.humorLevel === 'playful'}
                  onChange={() => setSettings({ ...settings, humorLevel: 'playful' })}
                />
                <span>Playful - Jokes and fun comparisons</span>
              </label>
            </div>
          </div>

          {/* User Names */}
          <div className="form-field">
            <label className="form-label">User Names (for personalization)</label>
            <input
              type="text"
              className="form-input"
              aria-label="User Names"
              value={settings.userNames.join(', ')}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  userNames: e.target.value
                    .split(',')
                    .map((n) => n.trim())
                    .filter((n) => n.length > 0),
                })
              }
              placeholder="Jack, Lauren"
            />
            <p className="form-hint">
              Comma-separated list. AI will address users by name. Max 10 names.
            </p>
          </div>

          {/* Custom Instructions */}
          <div className="form-field full-width">
            <label className="form-label">Custom Instructions (optional)</label>
            <textarea
              className="form-textarea"
              rows={3}
              maxLength={500}
              value={settings.customInstructions}
              onChange={(e) => setSettings({ ...settings, customInstructions: e.target.value })}
              placeholder="Additional context to append to system prompt..."
            />
            <p className="form-hint">
              <span className="admin-mono">{settings.customInstructions.length}/500</span>{' '}
              characters. Lower priority than default prompt.
            </p>
          </div>
        </div>
      </section>

      {/* Context-Aware Intelligence */}
      <section className="settings-section">
        <h2 className="section-title">Smart Adjustments</h2>
        <p className="section-description">
          AI adapts tone and emphasis based on time of day, calendar, and special occasions
        </p>

        <div className="form-grid">
          {/* Morning Tone */}
          <div className="form-field">
            <label className="form-label">Morning Tone (5am-5pm)</label>
            <select
              className="form-select"
              value={settings.morningTone}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  morningTone: e.target.value as 'energizing' | 'neutral' | 'custom',
                })
              }
            >
              <option value="energizing">Energizing & Action-Focused (recommended)</option>
              <option value="neutral">Neutral (no override)</option>
              <option value="custom">Custom (future)</option>
            </select>
          </div>

          {/* Evening Tone */}
          <div className="form-field">
            <label className="form-label">Evening Tone (5pm-5am)</label>
            <select
              className="form-select"
              value={settings.eveningTone}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  eveningTone: e.target.value as 'calming' | 'neutral' | 'custom',
                })
              }
            >
              <option value="calming">Calming & Reflective (recommended)</option>
              <option value="neutral">Neutral (no override)</option>
              <option value="custom">Custom (future)</option>
            </select>
          </div>

          {/* Stress-Aware Mode */}
          <div className="form-field full-width">
            <div className="toggle-row">
              <div className="toggle-info">
                <div className="toggle-label">Stress-Aware Mode</div>
                <div className="toggle-description">
                  Detects busy days (5+ events) and uses encouraging language. Reduces pressure.
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  aria-label="Stress-Aware Mode"
                  checked={settings.stressAwareEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, stressAwareEnabled: e.target.checked })
                  }
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Celebration Mode */}
          <div className="form-field full-width">
            <div className="toggle-row">
              <div className="toggle-info">
                <div className="toggle-label">Celebration Mode</div>
                <div className="toggle-description">
                  Detects weekends and uses upbeat, celebratory tone.
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  aria-label="Celebration Mode"
                  checked={settings.celebrationModeEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, celebrationModeEnabled: e.target.checked })
                  }
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Controls */}
      <section className="settings-section">
        <h2 className="section-title">Advanced Controls</h2>
        <p className="section-description">Power user settings for fine-tuned control</p>

        <div className="form-grid">
          {/* Stop Sequences */}
          <div className="form-field full-width">
            <label className="form-label">Stop Sequences</label>
            <input
              type="text"
              className="form-input"
              value={settings.stopSequences.join(', ')}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  stopSequences: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0),
                })
              }
              placeholder="urgent, breaking news, crisis"
            />
            <p className="form-hint">
              Comma-separated. AI will never generate these phrases. Max 10 sequences.
            </p>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="action-buttons sticky">
        <button
          onClick={handleSave}
          disabled={!hasUnsavedChanges() || saving}
          className="btn-primary"
        >
          {saving && <span className="spinner" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button onClick={handleReset} disabled={!hasUnsavedChanges()} className="btn-secondary">
          Reset Changes
        </button>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}
