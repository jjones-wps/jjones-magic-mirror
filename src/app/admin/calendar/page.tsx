'use client';

import { useState } from 'react';

interface CalendarFeed {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  lastSync: string;
  eventCount: number;
  status: 'ok' | 'error' | 'pending';
}

const initialFeeds: CalendarFeed[] = [
  {
    id: '1',
    name: 'Primary Calendar',
    url: 'https://calendar.google.com/calendar/ical/...',
    enabled: true,
    lastSync: '5 minutes ago',
    eventCount: 12,
    status: 'ok',
  },
  {
    id: '2',
    name: 'Family Calendar',
    url: 'https://p123-caldav.icloud.com/...',
    enabled: true,
    lastSync: '5 minutes ago',
    eventCount: 8,
    status: 'ok',
  },
];

export default function CalendarSettingsPage() {
  const [feeds, setFeeds] = useState<CalendarFeed[]>(initialFeeds);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [daysAhead, setDaysAhead] = useState(7);

  const testUrl = async () => {
    setTesting(true);
    // TODO: Call /api/admin/validate/calendar
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setTesting(false);
  };

  const addFeed = () => {
    if (newFeedName && newFeedUrl) {
      setFeeds([
        ...feeds,
        {
          id: Date.now().toString(),
          name: newFeedName,
          url: newFeedUrl,
          enabled: true,
          lastSync: 'Never',
          eventCount: 0,
          status: 'pending',
        },
      ]);
      setNewFeedName('');
      setNewFeedUrl('');
      setShowAddModal(false);
    }
  };

  const removeFeed = (id: string) => {
    setFeeds(feeds.filter((f) => f.id !== id));
  };

  const toggleFeed = (id: string) => {
    setFeeds(feeds.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
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
          <button className="admin-btn admin-btn-secondary" onClick={() => setShowAddModal(true)}>
            + Add Feed
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {feeds.map((feed) => (
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
                        feed.status === 'ok'
                          ? 'var(--admin-success)'
                          : feed.status === 'error'
                            ? 'var(--admin-error)'
                            : 'var(--admin-warning)',
                    }}
                  />
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
                  <span>Synced {feed.lastSync}</span>
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
          ))}
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
                  onChange={(e) => setNewFeedUrl(e.target.value)}
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

            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
              <button
                className="admin-btn admin-btn-secondary"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={addFeed}
                disabled={!newFeedName || !newFeedUrl}
              >
                Add Feed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
