'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface MirrorStatus {
  status: {
    online: boolean;
    lastPing: string;
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  config: {
    version: number;
    lastUpdated: string | null;
  };
  widgets: {
    enabled: number;
    total: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    category: string;
    details: Record<string, unknown> | null;
    createdAt: string;
    user: string;
  }>;
}

interface Widget {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  order: number;
  settings: Record<string, unknown>;
  updatedAt: string;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatAction(action: string): string {
  const actionMap: Record<string, string> = {
    'auth.login.success': 'Admin logged in',
    'auth.login.failed': 'Failed login attempt',
    'auth.logout': 'Admin logged out',
    'settings.update': 'Settings updated',
    'settings.create': 'Setting created',
    'widgets.update': 'Widget configuration changed',
    'mirror.refresh': 'Mirror display refreshed',
  };
  return actionMap[action] || action;
}

export default function AdminDashboard() {
  const [status, setStatus] = useState<MirrorStatus | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, widgetsRes] = await Promise.all([
        fetch('/api/admin/mirror/status'),
        fetch('/api/admin/widgets'),
      ]);

      if (!statusRes.ok || !widgetsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const statusData = await statusRes.json();
      const widgetsData = await widgetsRes.json();

      setStatus(statusData);
      setWidgets(widgetsData.widgets);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/mirror/refresh', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to refresh');
      // Refetch data to update activity log
      await fetchData();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
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
        Loading dashboard...
      </div>
    );
  }

  if (error) {
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
        <button className="admin-btn admin-btn-secondary" onClick={fetchData} style={{ marginTop: 'var(--space-md)' }}>
          Retry
        </button>
      </div>
    );
  }

  const isOnline = status?.status.online ?? false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Page Header */}
      <div
        className="admin-animate-in"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-sm)',
        }}
      >
        <h1 className="admin-heading-xl">Dashboard</h1>
        <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.9375rem' }}>
          Monitor and control your Magic Mirror display
        </p>
      </div>

      {/* Quick Actions */}
      <div
        className="admin-card admin-animate-in admin-animate-in-delay-1"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
          <div className="admin-status">
            <span className={`admin-status-dot ${isOnline ? 'online' : 'offline'}`}></span>
            <span style={{ color: isOnline ? 'var(--admin-success)' : 'var(--admin-error)' }}>
              {isOnline ? 'Mirror Online' : 'Mirror Offline'}
            </span>
          </div>
          <div
            className="admin-mono"
            style={{
              color: 'var(--admin-text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
            }}
          >
            <span style={{ opacity: 0.5 }}>◷</span>
            {currentTime}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button
            className="admin-btn admin-btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ opacity: refreshing ? 0.5 : 1 }}
          >
            <span
              style={{
                display: 'inline-block',
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
              }}
            >
              ↻
            </span>
            {refreshing ? 'Refreshing...' : 'Refresh Display'}
          </button>
          <a href="/" target="_blank" className="admin-btn admin-btn-primary" style={{ textDecoration: 'none' }}>
            View Mirror →
          </a>
        </div>
      </div>

      {/* Status Metrics */}
      <div className="admin-grid admin-grid-4">
        {[
          {
            label: 'Uptime',
            value: formatUptime(status?.status.uptime || 0),
            icon: '◷',
          },
          {
            label: 'Config Version',
            value: `v${status?.config.version || 0}`,
            icon: '↑',
          },
          {
            label: 'Memory',
            value: `${status?.status.memoryUsage || 0} MB`,
            icon: '▤',
          },
          {
            label: 'CPU Load',
            value: `${status?.status.cpuUsage || 0}`,
            icon: '◐',
          },
        ].map((metric, index) => (
          <div
            key={metric.label}
            className={`admin-card admin-animate-in admin-animate-in-delay-${index + 1}`}
            style={{ padding: 'var(--space-lg)' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-md)',
              }}
            >
              <span className="admin-label">{metric.label}</span>
              <span style={{ opacity: 0.3, fontSize: '1.25rem' }}>{metric.icon}</span>
            </div>
            <div className="admin-metric-value">{metric.value}</div>
          </div>
        ))}
      </div>

      {/* Widget Status Grid */}
      <div className="admin-card admin-animate-in admin-animate-in-delay-4">
        <div className="admin-card-header">
          <div>
            <h2 className="admin-heading-md">Active Widgets</h2>
            <p
              style={{
                color: 'var(--admin-text-tertiary)',
                fontSize: '0.8125rem',
                marginTop: 'var(--space-xs)',
              }}
            >
              {status?.widgets.enabled || 0} of {status?.widgets.total || 0} enabled
            </p>
          </div>
          <a
            href="/admin/widgets"
            className="admin-btn admin-btn-ghost"
            style={{ textDecoration: 'none' }}
          >
            Manage →
          </a>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'var(--space-md)',
          }}
        >
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className={`admin-widget-card ${!widget.enabled ? 'disabled' : ''}`}
            >
              <div className="admin-widget-info">
                <div
                  className="admin-widget-icon"
                  style={{
                    background: widget.enabled
                      ? 'var(--admin-success-muted)'
                      : 'var(--admin-accent-muted)',
                    color: widget.enabled
                      ? 'var(--admin-success)'
                      : 'var(--admin-text-tertiary)',
                  }}
                >
                  {widget.enabled ? '●' : '○'}
                </div>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: '2px' }}>{widget.name}</div>
                  <div
                    className="admin-mono"
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--admin-text-tertiary)',
                    }}
                  >
                    {widget.description || 'No description'}
                  </div>
                </div>
              </div>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: widget.enabled ? 'var(--admin-success)' : 'var(--admin-border)',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-card admin-animate-in admin-animate-in-delay-4">
        <div className="admin-card-header">
          <h2 className="admin-heading-md">Recent Activity</h2>
          <span className="admin-label">Last 10 actions</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {status?.recentActivity && status.recentActivity.length > 0 ? (
            status.recentActivity.map((activity, index) => (
              <div
                key={activity.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-sm) 0',
                  borderBottom:
                    index < status.recentActivity.length - 1
                      ? '1px solid var(--admin-border-subtle)'
                      : 'none',
                }}
              >
                <span
                  className="admin-mono"
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--admin-text-muted)',
                    minWidth: '90px',
                  }}
                >
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </span>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background:
                      activity.category === 'auth'
                        ? 'var(--admin-warning)'
                        : activity.action.includes('success')
                          ? 'var(--admin-success)'
                          : 'var(--admin-info)',
                  }}
                />
                <span style={{ color: 'var(--admin-text-secondary)', fontSize: '0.875rem' }}>
                  {formatAction(activity.action)}
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.75rem',
                    color: 'var(--admin-text-tertiary)',
                  }}
                >
                  {activity.user}
                </span>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--admin-text-tertiary)', fontSize: '0.875rem' }}>
              No recent activity
            </p>
          )}
        </div>
      </div>

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
