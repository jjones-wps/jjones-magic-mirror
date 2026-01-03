'use client';

import { useState, useEffect } from 'react';
import { useToast, ToastContainer } from '@/components/admin/Toast';

// Color palette for rotating calendar colors
const COLOR_PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface CalendarFeed {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  color?: string | null;
  lastSync?: Date | null;
  lastError?: string | null;
  eventCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function CalendarSettingsPage() {
  const [feeds, setFeeds] = useState<CalendarFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedColor, setNewFeedColor] = useState(() => COLOR_PALETTE[0]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [daysAhead, setDaysAhead] = useState(7);
  const { toasts, closeToast, success, error } = useToast();

  useEffect(() => {
    fetchFeeds();
  }, []);

  // Get next color from palette based on number of feeds
  const getNextColor = () => {
    return COLOR_PALETTE[feeds.length % COLOR_PALETTE.length];
  };

  const fetchFeeds = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/calendar');
      if (!response.ok) throw new Error('Failed to fetch calendar feeds');
      const data = await response.json();
      setFeeds(data.feeds || []);
    } catch (err) {
      error('Failed to load feeds', err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching feeds:', err);
    } finally {
      setLoading(false);
    }
  };

  const testUrl = async () => {
    if (!newFeedUrl) return;

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/calendar/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newFeedUrl }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setTestResult({
          valid: true,
          message: data.message || 'Calendar feed is valid',
        });
      } else {
        setTestResult({
          valid: false,
          error: data.error || 'Invalid calendar feed',
        });
      }
    } catch (err) {
      setTestResult({
        valid: false,
        error: err instanceof Error ? err.message : 'Failed to validate URL',
      });
    } finally {
      setTesting(false);
    }
  };

  const addFeed = async () => {
    if (!newFeedName || !newFeedUrl) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFeedName,
          url: newFeedUrl,
          enabled: true,
          color: newFeedColor,
        }),
      });

      if (!response.ok) throw new Error('Failed to add calendar feed');

      const data = await response.json();
      setFeeds((prevFeeds) => [...prevFeeds, data.feed]);
      setNewFeedName('');
      setNewFeedUrl('');
      setNewFeedColor(COLOR_PALETTE[0]);
      setTestResult(null);
      setShowAddModal(false);
      success('Feed added', 'Calendar feed added successfully');
    } catch (err) {
      console.error('Error adding feed:', err);
      error('Failed to add feed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const removeFeed = async (id: string) => {
    if (!confirm('Are you sure you want to remove this calendar feed?')) return;

    try {
      const response = await fetch(`/api/admin/calendar/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove calendar feed');

      setFeeds((prevFeeds) => prevFeeds.filter((f) => f.id !== id));
      success('Feed removed', 'Calendar feed removed successfully');
    } catch (err) {
      console.error('Error removing feed:', err);
      error('Failed to remove feed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const toggleFeed = (id: string) => {
    setFeeds(feeds.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/calendar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeds: feeds.map((f) => ({ id: f.id, enabled: f.enabled })),
        }),
      });

      if (!response.ok) throw new Error('Failed to save changes');

      setHasUnsavedChanges(false);
      success('Settings saved', 'Calendar settings updated successfully');
    } catch (err) {
      console.error('Error saving changes:', err);
      error('Failed to save settings', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    fetchFeeds();
    setHasUnsavedChanges(false);
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
        }}
      >
        <p style={{ color: 'var(--admin-text-secondary)' }}>Loading calendar feeds...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Unsaved Changes Bar */}
      {hasUnsavedChanges && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'var(--admin-surface)',
            borderTop: '1px solid var(--admin-border)',
            padding: 'var(--space-lg) var(--space-xl)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 100,
          }}
        >
          <p style={{ color: 'var(--admin-text-secondary)' }}>You have unsaved changes</p>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button
              className="admin-btn admin-btn-secondary"
              onClick={handleDiscard}
              disabled={saving}
            >
              Discard
            </button>
            <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="admin-animate-in">
        <h1 className="admin-heading-xl">Calendar Settings</h1>
        <p
          style={{
            color: 'var(--admin-text-secondary)',
            fontSize: '0.9375rem',
            marginTop: 'var(--space-sm)',
          }}
        >
          Manage iCal feeds and display options
        </p>
      </div>

      {/* Display Settings */}
      <div className="admin-card admin-animate-in admin-animate-in-delay-1">
        <div className="admin-card-header">
          <h2 className="admin-heading-md">Display Options</h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-lg)',
          }}
        >
          <div>
            <label
              className="admin-label"
              style={{ display: 'block', marginBottom: 'var(--space-sm)' }}
            >
              Days Ahead
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <input
                type="range"
                min="1"
                max="14"
                value={daysAhead}
                onChange={(e) => setDaysAhead(Number(e.target.value))}
                style={{
                  flex: 1,
                  accentColor: 'var(--admin-text-primary)',
                  background: 'var(--admin-border)',
                  height: '4px',
                  borderRadius: '2px',
                }}
              />
              <span
                className="admin-mono"
                style={{
                  minWidth: '60px',
                  textAlign: 'right',
                  color: 'var(--admin-text-secondary)',
                }}
              >
                {daysAhead} days
              </span>
            </div>
          </div>

          <div>
            <label
              className="admin-label"
              style={{ display: 'block', marginBottom: 'var(--space-sm)' }}
            >
              Max Events Shown
            </label>
            <select className="admin-input" style={{ cursor: 'pointer' }} defaultValue="5">
              <option value="3">3 events</option>
              <option value="5">5 events</option>
              <option value="7">7 events</option>
              <option value="10">10 events</option>
            </select>
          </div>

          <div>
            <label
              className="admin-label"
              style={{ display: 'block', marginBottom: 'var(--space-sm)' }}
            >
              Refresh Interval
            </label>
            <select className="admin-input" style={{ cursor: 'pointer' }} defaultValue="5">
              <option value="1">1 minute</option>
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Feeds */}
      <div className="admin-card admin-animate-in admin-animate-in-delay-2">
        <div className="admin-card-header">
          <div>
            <h2 className="admin-heading-md">Calendar Feeds</h2>
            <p
              style={{
                color: 'var(--admin-text-tertiary)',
                fontSize: '0.8125rem',
                marginTop: 'var(--space-xs)',
              }}
            >
              {feeds.length} feed{feeds.length !== 1 ? 's' : ''} configured
            </p>
          </div>
          <button
            className="admin-btn admin-btn-secondary"
            onClick={() => {
              setNewFeedColor(getNextColor());
              setShowAddModal(true);
            }}
          >
            + Add Feed
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {feeds.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-xl)',
                color: 'var(--admin-text-secondary)',
              }}
            >
              No calendar feeds configured. Click &quot;Add Feed&quot; to get started.
            </div>
          ) : (
            feeds.map((feed) => {
              const status = feed.lastError ? 'error' : feed.lastSync ? 'ok' : 'pending';
              const lastSyncText = feed.lastSync
                ? new Date(feed.lastSync).toLocaleString('en-US')
                : 'Never';

              return (
                <div
                  key={feed.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-lg)',
                    background: 'var(--admin-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--admin-border-subtle)',
                    opacity: feed.enabled ? 1 : 0.5,
                    transition: 'opacity var(--transition-base)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        marginBottom: 'var(--space-xs)',
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background:
                            status === 'ok'
                              ? 'var(--admin-success)'
                              : status === 'error'
                                ? 'var(--admin-error)'
                                : 'var(--admin-warning)',
                        }}
                      />
                      {feed.color && (
                        <span
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '2px',
                            background: feed.color,
                          }}
                        />
                      )}
                      <h3 style={{ fontWeight: 500 }}>{feed.name}</h3>
                    </div>
                    <div
                      className="admin-mono"
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--admin-text-tertiary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '400px',
                      }}
                    >
                      {feed.url}
                    </div>
                    {feed.lastError && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--admin-error)',
                          marginTop: 'var(--space-xs)',
                        }}
                      >
                        Error: {feed.lastError}
                      </div>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        gap: 'var(--space-lg)',
                        marginTop: 'var(--space-sm)',
                        fontSize: '0.8125rem',
                        color: 'var(--admin-text-muted)',
                      }}
                    >
                      <span>{feed.eventCount} events</span>
                      <span>Synced {lastSyncText}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <button
                      className="admin-btn admin-btn-ghost"
                      style={{ padding: 'var(--space-sm)' }}
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      className="admin-btn admin-btn-ghost"
                      style={{ padding: 'var(--space-sm)', color: 'var(--admin-error)' }}
                      onClick={() => removeFeed(feed.id)}
                      title="Remove"
                    >
                      ✕
                    </button>
                    <button
                      className={`admin-toggle ${feed.enabled ? 'active' : ''}`}
                      onClick={() => toggleFeed(feed.id)}
                    >
                      <div className="admin-toggle-knob" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Feed Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-lg)',
            zIndex: 1000,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="admin-card admin-animate-in"
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: 'var(--space-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="admin-heading-lg" style={{ marginBottom: 'var(--space-lg)' }}>
              Add Calendar Feed
            </h2>

            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label
                className="admin-label"
                style={{ display: 'block', marginBottom: 'var(--space-sm)' }}
              >
                Name
              </label>
              <input
                type="text"
                className="admin-input"
                placeholder="Work Calendar"
                value={newFeedName}
                onChange={(e) => setNewFeedName(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label
                className="admin-label"
                style={{ display: 'block', marginBottom: 'var(--space-sm)' }}
              >
                iCal URL
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <input
                  type="url"
                  className="admin-input"
                  placeholder="https://calendar.google.com/calendar/ical/..."
                  value={newFeedUrl}
                  onChange={(e) => {
                    setNewFeedUrl(e.target.value);
                    setTestResult(null);
                  }}
                  style={{ flex: 1 }}
                />
                <button
                  className="admin-btn admin-btn-secondary"
                  onClick={testUrl}
                  disabled={testing || !newFeedUrl}
                  style={{ minWidth: '80px' }}
                >
                  {testing ? '...' : 'Test'}
                </button>
              </div>
              {testResult && (
                <div
                  style={{
                    marginTop: 'var(--space-sm)',
                    padding: 'var(--space-sm)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem',
                    background: testResult.valid
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'rgba(239, 68, 68, 0.1)',
                    color: testResult.valid ? 'var(--admin-success)' : 'var(--admin-error)',
                  }}
                >
                  {testResult.valid ? testResult.message : testResult.error}
                </div>
              )}
              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--admin-text-muted)',
                  marginTop: 'var(--space-sm)',
                }}
              >
                Supports Google Calendar, iCloud, Outlook, and other iCal feeds
              </p>
            </div>

            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label
                className="admin-label"
                style={{ display: 'block', marginBottom: 'var(--space-sm)' }}
              >
                Calendar Color
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                <input
                  type="color"
                  value={newFeedColor}
                  onChange={(e) => setNewFeedColor(e.target.value)}
                  style={{
                    width: '60px',
                    height: '40px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--admin-border)',
                    cursor: 'pointer',
                  }}
                />
                <span className="admin-mono" style={{ fontSize: '0.875rem' }}>
                  {newFeedColor}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
              <button
                className="admin-btn admin-btn-secondary"
                onClick={() => {
                  setShowAddModal(false);
                  setNewFeedName('');
                  setNewFeedUrl('');
                  setNewFeedColor(COLOR_PALETTE[0]);
                  setTestResult(null);
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={addFeed}
                disabled={!newFeedName || !newFeedUrl || saving}
              >
                {saving ? 'Adding...' : 'Add Feed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}
