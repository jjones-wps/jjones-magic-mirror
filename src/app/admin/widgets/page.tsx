// @ts-nocheck
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Widget {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  order: number;
  settings: Record<string, unknown>;
  updatedAt: string;
}

// Icon mapping for widgets
const widgetIcons: Record<string, string> = {
  clock: '◷',
  weather: '◐',
  calendar: '◫',
  news: '▤',
  'ai-summary': '◈',
  commute: '→',
  spotify: '♫',
};

export default function WidgetsPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [originalWidgets, setOriginalWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasChanges = useRef(false);
  const [, forceUpdate] = useState({});

  const fetchWidgets = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/widgets');
      if (!res.ok) throw new Error('Failed to fetch widgets');
      const data = await res.json();
      setWidgets(data.widgets);
      setOriginalWidgets(data.widgets);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load widgets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  const toggleWidget = (id: string) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)));
    hasChanges.current = true;
    forceUpdate({});
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Find changed widgets
      const changedWidgets = widgets.filter((w) => {
        const original = originalWidgets.find((o) => o.id === w.id);
        return original && original.enabled !== w.enabled;
      });

      if (changedWidgets.length === 0) {
        hasChanges.current = false;
        forceUpdate({});
        setSaving(false);
        return;
      }

      const res = await fetch('/api/admin/widgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgets: changedWidgets.map((w) => ({ id: w.id, enabled: w.enabled })),
        }),
      });

      if (!res.ok) throw new Error('Failed to save widgets');

      // Trigger mirror refresh
      await fetch('/api/admin/mirror/refresh', { method: 'POST' });

      // Refetch to get updated data
      await fetchWidgets();
      hasChanges.current = false;
      forceUpdate({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setWidgets(originalWidgets);
    hasChanges.current = false;
    forceUpdate({});
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          color: 'var(--admin-text-tertiary)',
        }}
      >
        <span style={{ animation: 'spin 1s linear infinite', marginRight: 'var(--space-sm)' }}>
          ◌
        </span>
        Loading widgets...
      </div>
    );
  }

  if (error && widgets.length === 0) {
    return (
      <div
        className="admin-card"
        style={{
          padding: 'var(--space-xl)',
          textAlign: 'center',
          color: 'var(--admin-error)',
        }}
      >
        <p>Error: {error}</p>
        <button
          className="admin-btn admin-btn-secondary"
          onClick={fetchWidgets}
          style={{ marginTop: 'var(--space-md)' }}
        >
          Retry
        </button>
      </div>
    );
  }

  const enabledCount = widgets.filter((w) => w.enabled).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Page Header */}
      <div
        className="admin-animate-in"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
        }}
      >
        <div>
          <h1 className="admin-heading-xl">Widgets</h1>
          <p
            style={{
              color: 'var(--admin-text-secondary)',
              fontSize: '0.9375rem',
              marginTop: 'var(--space-sm)',
            }}
          >
            Enable or disable display widgets. Changes require a display refresh.
          </p>
        </div>

        {hasChanges.current && (
          <button
            className="admin-btn admin-btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{
              opacity: saving ? 0.7 : 1,
              minWidth: '140px',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Stats */}
      <div
        className="admin-card admin-animate-in admin-animate-in-delay-1"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-xl)',
          padding: 'var(--space-lg)',
        }}
      >
        <div className="admin-metric">
          <div className="admin-metric-value" style={{ color: 'var(--admin-success)' }}>
            {enabledCount}
          </div>
          <div className="admin-metric-label">Enabled</div>
        </div>
        <div
          style={{
            width: '1px',
            height: '40px',
            background: 'var(--admin-border)',
          }}
        />
        <div className="admin-metric">
          <div className="admin-metric-value" style={{ color: 'var(--admin-text-tertiary)' }}>
            {widgets.length - enabledCount}
          </div>
          <div className="admin-metric-label">Disabled</div>
        </div>
        <div
          style={{
            width: '1px',
            height: '40px',
            background: 'var(--admin-border)',
          }}
        />
        <div className="admin-metric">
          <div className="admin-metric-value">{widgets.length}</div>
          <div className="admin-metric-label">Total</div>
        </div>
      </div>

      {/* Widget List */}
      <div
        className="admin-animate-in admin-animate-in-delay-2"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-md)',
        }}
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className="admin-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-lg)',
              opacity: widget.enabled ? 1 : 0.6,
              transition: 'opacity var(--transition-base)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
              {/* Icon */}
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: widget.enabled
                    ? 'var(--admin-accent-muted)'
                    : 'var(--admin-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '1.5rem',
                  transition: 'background var(--transition-base)',
                }}
              >
                {widgetIcons[widget.id] || '◉'}
              </div>

              {/* Info */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-xs)',
                  }}
                >
                  <h3 style={{ fontWeight: 500, fontSize: '1rem' }}>{widget.name}</h3>
                  {widget.enabled && (
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontFamily: 'var(--font-mono)',
                        padding: '2px 6px',
                        background: 'var(--admin-success-muted)',
                        color: 'var(--admin-success)',
                        borderRadius: 'var(--radius-sm)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>
                <p
                  style={{
                    color: 'var(--admin-text-tertiary)',
                    fontSize: '0.875rem',
                    maxWidth: '400px',
                  }}
                >
                  {widget.description || 'No description'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <button
                className="admin-btn admin-btn-ghost"
                style={{ padding: 'var(--space-sm)' }}
                title="Configure widget"
              >
                ⚙
              </button>

              {/* Toggle */}
              <button
                className={`admin-toggle ${widget.enabled ? 'active' : ''}`}
                onClick={() => toggleWidget(widget.id)}
                aria-label={`Toggle ${widget.name}`}
              >
                <div className="admin-toggle-knob" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Unsaved Changes Bar */}
      {hasChanges.current && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 'var(--space-md) var(--space-lg)',
            background: 'rgba(10, 10, 10, 0.95)',
            borderTop: '1px solid var(--admin-border)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-md)',
            zIndex: 100,
          }}
        >
          <span style={{ color: 'var(--admin-text-secondary)', fontSize: '0.875rem' }}>
            You have unsaved changes
          </span>
          <button className="admin-btn admin-btn-secondary" onClick={handleDiscard}>
            Discard
          </button>
          <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Refresh Mirror'}
          </button>
        </div>
      )}

      {/* Keyframe for spinner */}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
