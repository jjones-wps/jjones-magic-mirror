'use client';

/**
 * AI Summary Settings Admin Page
 *
 * Configure which context data is passed to the AI summary generator.
 * This allows granular control over what information the AI uses when
 * creating daily briefings.
 *
 * NOTE: This is a feature stub. The toggles are saved to the database
 * but not yet consumed by the summary API route. Full implementation
 * requires updating /api/summary/route.ts to conditionally include
 * context based on these settings.
 */

import { useState, useEffect } from 'react';

interface AISummarySettings {
  // Weather context toggles
  includeWeatherLocation: boolean;
  includeFeelsLike: boolean;
  includeWindSpeed: boolean;
  includePrecipitation: boolean;
  includeTomorrowWeather: boolean;

  // Calendar context toggles
  includeCalendar: boolean;
  includeEventTimes: boolean;
  includeTimeUntilNext: boolean;
  includeAllDayEvents: boolean;

  // Commute context toggles
  includeCommute: boolean;
  includeCommuteDeviation: boolean;

  // Time context toggles
  includeDayDate: boolean;
  includeWeekendDetection: boolean;
}

const DEFAULT_SETTINGS: AISummarySettings = {
  includeWeatherLocation: true,
  includeFeelsLike: true,
  includeWindSpeed: true,
  includePrecipitation: true,
  includeTomorrowWeather: true,
  includeCalendar: true,
  includeEventTimes: true,
  includeTimeUntilNext: true,
  includeAllDayEvents: true,
  includeCommute: true,
  includeCommuteDeviation: true,
  includeDayDate: true,
  includeWeekendDetection: true,
};

export default function AISummarySettingsPage() {
  const [settings, setSettings] = useState<AISummarySettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<AISummarySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/ai-summary');
      if (!response.ok) {
        // If settings don't exist, use defaults
        if (response.status === 404) {
          setSettings(DEFAULT_SETTINGS);
          setOriginalSettings(DEFAULT_SETTINGS);
          return;
        }
        throw new Error('Failed to fetch AI summary settings');
      }
      const data = await response.json();
      setSettings(data);
      setOriginalSettings(data);
    } catch (err) {
      setInlineError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof AISummarySettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setInlineError(null);
    setSuccessMessage(null);
  };

  const hasUnsavedChanges = () => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setInlineError(null);

      const response = await fetch('/api/admin/ai-summary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setOriginalSettings(settings);
      setSuccessMessage('Settings saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setInlineError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    setInlineError(null);
    setSuccessMessage(null);
  };

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">AI Summary Settings</h1>
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">AI Summary Settings</h1>

      <div className="warning-banner">
        <strong>⚠️ Feature Stub:</strong> These settings are saved to the database but not yet
        consumed by the summary API. Full implementation requires updating{' '}
        <code>/api/summary/route.ts</code> to conditionally include context based on these toggles.
      </div>

      {/* Weather Context */}
      <section className="settings-section">
        <h2 className="section-title">Weather Context</h2>
        <p className="section-description">
          Control which weather information is included in the AI summary
        </p>

        <div className="toggle-list">
          <ToggleRow
            label="Location Name"
            description="Include location name (e.g., 'Fort Wayne, IN')"
            checked={settings.includeWeatherLocation}
            onChange={() => handleToggle('includeWeatherLocation')}
          />
          <ToggleRow
            label="Feels Like Temperature"
            description="Show feels-like temp when it differs from actual by >5°"
            checked={settings.includeFeelsLike}
            onChange={() => handleToggle('includeFeelsLike')}
          />
          <ToggleRow
            label="Wind Speed"
            description="Include wind speed when >15mph"
            checked={settings.includeWindSpeed}
            onChange={() => handleToggle('includeWindSpeed')}
          />
          <ToggleRow
            label="Precipitation Forecast"
            description="Show precipitation probability and type (rain/snow/etc.)"
            checked={settings.includePrecipitation}
            onChange={() => handleToggle('includePrecipitation')}
          />
          <ToggleRow
            label="Tomorrow's Weather"
            description="Include tomorrow's forecast in evening briefings (after 5pm)"
            checked={settings.includeTomorrowWeather}
            onChange={() => handleToggle('includeTomorrowWeather')}
          />
        </div>
      </section>

      {/* Calendar Context */}
      <section className="settings-section">
        <h2 className="section-title">Calendar Context</h2>
        <p className="section-description">
          Control which calendar information is included in the AI summary
        </p>

        <div className="toggle-list">
          <ToggleRow
            label="Calendar Events"
            description="Include today's calendar events"
            checked={settings.includeCalendar}
            onChange={() => handleToggle('includeCalendar')}
          />
          <ToggleRow
            label="Event Times"
            description="Show specific times for calendar events"
            checked={settings.includeEventTimes}
            onChange={() => handleToggle('includeEventTimes')}
            disabled={!settings.includeCalendar}
          />
          <ToggleRow
            label="Time Until Next Event"
            description="Show urgency indicators for events starting soon (&lt;3hrs)"
            checked={settings.includeTimeUntilNext}
            onChange={() => handleToggle('includeTimeUntilNext')}
            disabled={!settings.includeCalendar}
          />
          <ToggleRow
            label="All-Day Events"
            description="Distinguish between all-day and timed events"
            checked={settings.includeAllDayEvents}
            onChange={() => handleToggle('includeAllDayEvents')}
            disabled={!settings.includeCalendar}
          />
        </div>
      </section>

      {/* Commute Context */}
      <section className="settings-section">
        <h2 className="section-title">Commute Context</h2>
        <p className="section-description">
          Control commute information (weekday mornings only, 6am-9am)
        </p>

        <div className="toggle-list">
          <ToggleRow
            label="Commute Times"
            description="Include current commute duration"
            checked={settings.includeCommute}
            onChange={() => handleToggle('includeCommute')}
          />
          <ToggleRow
            label="Traffic Deviation Alerts"
            description="Show traffic alerts when commute deviates ±3min from baseline"
            checked={settings.includeCommuteDeviation}
            onChange={() => handleToggle('includeCommuteDeviation')}
            disabled={!settings.includeCommute}
          />
        </div>
      </section>

      {/* Time Context */}
      <section className="settings-section">
        <h2 className="section-title">Time Context</h2>
        <p className="section-description">Control time-based contextual information</p>

        <div className="toggle-list">
          <ToggleRow
            label="Day and Date"
            description="Include day name and date (e.g., 'Friday, January 2')"
            checked={settings.includeDayDate}
            onChange={() => handleToggle('includeDayDate')}
          />
          <ToggleRow
            label="Weekend Detection"
            description="Mention when it's the weekend"
            checked={settings.includeWeekendDetection}
            onChange={() => handleToggle('includeWeekendDetection')}
          />
        </div>
      </section>

      {/* Actions */}
      {inlineError && <div className="error-message">{inlineError}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="action-buttons">
        <button
          onClick={handleSave}
          disabled={!hasUnsavedChanges() || saving}
          className="btn-primary"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button onClick={handleReset} disabled={!hasUnsavedChanges()} className="btn-secondary">
          Reset Changes
        </button>
      </div>
    </div>
  );
}

// Toggle Row Component
interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

function ToggleRow({ label, description, checked, onChange, disabled = false }: ToggleRowProps) {
  return (
    <div className={`toggle-row ${disabled ? 'disabled' : ''}`}>
      <div className="toggle-info">
        <div className="toggle-label">{label}</div>
        <div className="toggle-description">{description}</div>
      </div>
      <label className="toggle-switch">
        <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
        <span className="toggle-slider"></span>
      </label>
    </div>
  );
}
