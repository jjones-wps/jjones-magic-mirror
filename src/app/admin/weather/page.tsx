'use client';

import { useState, useEffect } from 'react';

interface WeatherSettings {
  latitude: string;
  longitude: string;
  location: string;
  units: 'fahrenheit' | 'celsius';
}

export default function WeatherSettingsPage() {
  const [settings, setSettings] = useState<WeatherSettings>({
    latitude: '',
    longitude: '',
    location: '',
    units: 'fahrenheit',
  });
  const [originalSettings, setOriginalSettings] = useState<WeatherSettings>({
    latitude: '',
    longitude: '',
    location: '',
    units: 'fahrenheit',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch current settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/weather');
      if (!response.ok) {
        throw new Error('Failed to fetch weather settings');
      }
      const data = await response.json();
      setSettings(data);
      setOriginalSettings(data);
    } catch (err) {
      setInlineError(err instanceof Error ? err.message : 'Failed to load weather settings');
    } finally {
      setLoading(false);
    }
  };

  const hasUnsavedChanges = () => {
    return (
      settings.latitude !== originalSettings.latitude ||
      settings.longitude !== originalSettings.longitude ||
      settings.location !== originalSettings.location ||
      settings.units !== originalSettings.units
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setInlineError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/admin/weather', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save weather settings');
      }

      setOriginalSettings(settings);
      setSuccessMessage('Weather settings saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setInlineError(err instanceof Error ? err.message : 'Failed to save weather settings');
      setTimeout(() => setInlineError(null), 5000);
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
      <div
        role="status"
        aria-live="polite"
        style={{
          padding: 'var(--space-xl)',
          textAlign: 'center',
          color: 'var(--admin-text-secondary)',
        }}
      >
        <p>Loading weather settings...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-xl)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1
          style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 600,
            color: 'var(--admin-text-primary)',
            marginBottom: 'var(--space-sm)',
          }}
        >
          Weather Settings
        </h1>
        <p style={{ color: 'var(--admin-text-secondary)' }}>
          Configure location and temperature units for weather display
        </p>
      </div>

      {/* Error Message */}
      {inlineError && (
        <div
          style={{
            padding: 'var(--space-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--admin-error)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--admin-error)',
            marginBottom: 'var(--space-lg)',
          }}
        >
          {inlineError}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div
          style={{
            padding: 'var(--space-md)',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--admin-success)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--admin-success)',
            marginBottom: 'var(--space-lg)',
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Settings Form */}
      <div
        style={{
          background: 'var(--admin-card-bg)',
          border: '1px solid var(--admin-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-xl)',
        }}
      >
        {/* Location */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label
            htmlFor="location"
            style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              color: 'var(--admin-text-primary)',
              marginBottom: 'var(--space-xs)',
            }}
          >
            Location Name
          </label>
          <input
            id="location"
            type="text"
            value={settings.location}
            onChange={(e) => setSettings((prev) => ({ ...prev, location: e.target.value }))}
            placeholder="Fort Wayne, IN"
            style={{
              width: '100%',
              padding: 'var(--space-sm)',
              background: 'var(--admin-input-bg)',
              border: '1px solid var(--admin-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--admin-text-primary)',
              fontSize: 'var(--font-size-base)',
            }}
          />
          <p
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--admin-text-tertiary)',
              marginTop: 'var(--space-xs)',
            }}
          >
            Display name for the weather location
          </p>
        </div>

        {/* Latitude and Longitude */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
          }}
        >
          <div>
            <label
              htmlFor="latitude"
              style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
                color: 'var(--admin-text-primary)',
                marginBottom: 'var(--space-xs)',
              }}
            >
              Latitude
            </label>
            <input
              id="latitude"
              type="text"
              value={settings.latitude}
              onChange={(e) => setSettings((prev) => ({ ...prev, latitude: e.target.value }))}
              placeholder="41.0793"
              style={{
                width: '100%',
                padding: 'var(--space-sm)',
                background: 'var(--admin-input-bg)',
                border: '1px solid var(--admin-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--admin-text-primary)',
                fontSize: 'var(--font-size-base)',
              }}
            />
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--admin-text-tertiary)',
                marginTop: 'var(--space-xs)',
              }}
            >
              -90 to 90
            </p>
          </div>

          <div>
            <label
              htmlFor="longitude"
              style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
                color: 'var(--admin-text-primary)',
                marginBottom: 'var(--space-xs)',
              }}
            >
              Longitude
            </label>
            <input
              id="longitude"
              type="text"
              value={settings.longitude}
              onChange={(e) => setSettings((prev) => ({ ...prev, longitude: e.target.value }))}
              placeholder="-85.1394"
              style={{
                width: '100%',
                padding: 'var(--space-sm)',
                background: 'var(--admin-input-bg)',
                border: '1px solid var(--admin-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--admin-text-primary)',
                fontSize: 'var(--font-size-base)',
              }}
            />
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--admin-text-tertiary)',
                marginTop: 'var(--space-xs)',
              }}
            >
              -180 to 180
            </p>
          </div>
        </div>

        {/* Temperature Units */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <label
            style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              color: 'var(--admin-text-primary)',
              marginBottom: 'var(--space-sm)',
            }}
          >
            Temperature Units
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                cursor: 'pointer',
                padding: 'var(--space-sm) var(--space-md)',
                background:
                  settings.units === 'fahrenheit' ? 'var(--admin-primary-hover)' : 'transparent',
                border: `1px solid ${
                  settings.units === 'fahrenheit' ? 'var(--admin-primary)' : 'var(--admin-border)'
                }`,
                borderRadius: 'var(--radius-md)',
                color: 'var(--admin-text-primary)',
              }}
            >
              <input
                type="radio"
                name="units"
                value="fahrenheit"
                checked={settings.units === 'fahrenheit'}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    units: e.target.value as 'fahrenheit' | 'celsius',
                  }))
                }
                style={{ margin: 0 }}
              />
              <span>Fahrenheit (°F)</span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                cursor: 'pointer',
                padding: 'var(--space-sm) var(--space-md)',
                background:
                  settings.units === 'celsius' ? 'var(--admin-primary-hover)' : 'transparent',
                border: `1px solid ${
                  settings.units === 'celsius' ? 'var(--admin-primary)' : 'var(--admin-border)'
                }`,
                borderRadius: 'var(--radius-md)',
                color: 'var(--admin-text-primary)',
              }}
            >
              <input
                type="radio"
                name="units"
                value="celsius"
                checked={settings.units === 'celsius'}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    units: e.target.value as 'fahrenheit' | 'celsius',
                  }))
                }
                style={{ margin: 0 }}
              />
              <span>Celsius (°C)</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-md)',
            paddingTop: 'var(--space-lg)',
            borderTop: '1px solid var(--admin-border)',
          }}
        >
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges()}
            style={{
              padding: 'var(--space-sm) var(--space-lg)',
              background: hasUnsavedChanges() ? 'var(--admin-primary)' : 'var(--admin-border)',
              color: hasUnsavedChanges() ? 'white' : 'var(--admin-text-tertiary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 500,
              cursor: hasUnsavedChanges() && !saving ? 'pointer' : 'not-allowed',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          <button
            onClick={handleReset}
            disabled={!hasUnsavedChanges()}
            style={{
              padding: 'var(--space-sm) var(--space-lg)',
              background: 'transparent',
              color: 'var(--admin-text-secondary)',
              border: '1px solid var(--admin-border)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 500,
              cursor: hasUnsavedChanges() ? 'pointer' : 'not-allowed',
              opacity: hasUnsavedChanges() ? 1 : 0.5,
            }}
          >
            Reset
          </button>
        </div>

        {/* Unsaved Changes Indicator */}
        {hasUnsavedChanges() && (
          <p
            style={{
              marginTop: 'var(--space-md)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--admin-warning)',
            }}
          >
            ⚠ You have unsaved changes
          </p>
        )}
      </div>

      {/* Help Text */}
      <div
        style={{
          marginTop: 'var(--space-lg)',
          padding: 'var(--space-md)',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--admin-text-secondary)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        <p style={{ marginBottom: 'var(--space-xs)' }}>
          <strong>Tip:</strong> To find coordinates for your location:
        </p>
        <ul style={{ marginLeft: 'var(--space-lg)', marginTop: 'var(--space-xs)' }}>
          <li>Search your address on Google Maps</li>
          <li>Right-click on the map and select &quot;What&apos;s here?&quot;</li>
          <li>Copy the latitude and longitude values</li>
        </ul>
      </div>
    </div>
  );
}
