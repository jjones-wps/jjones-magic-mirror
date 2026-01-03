'use client';

import { useState, useEffect } from 'react';
import { useToast, ToastContainer } from '@/components/admin/Toast';

interface SystemStatus {
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

export default function SystemPage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toasts, closeToast, success, error } = useToast();

  // Fetch system status on mount and every 5 seconds
  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/admin/mirror/status');
      if (!response.ok) {
        throw new Error('Failed to fetch system status');
      }
      const data = await response.json();
      setSystemStatus(data);
      setLoading(false);
    } catch (err) {
      error('Failed to load system status', err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  const handleForceRefresh = async () => {
    try {
      setRefreshing(true);

      const response = await fetch('/api/admin/mirror/refresh', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to trigger refresh');
      }

      const data = await response.json();
      success('Mirror refreshed', data.message || 'Mirror refresh triggered successfully');

      // Refresh status immediately
      await fetchSystemStatus();
    } catch (err) {
      error('Failed to trigger refresh', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRefreshing(false);
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.join(' ') || '0m';
  };

  const formatActionLabel = (action: string): string => {
    // Convert action strings to user-friendly labels
    const labels: Record<string, string> = {
      'auth.login': 'User Login',
      'auth.logout': 'User Logout',
      'calendar.create': 'Calendar Added',
      'calendar.update': 'Calendar Updated',
      'calendar.delete': 'Calendar Deleted',
      'weather.update': 'Weather Updated',
      'commute.create': 'Commute Added',
      'commute.update': 'Commute Updated',
      'commute.delete': 'Commute Deleted',
      'mirror.refresh': 'Mirror Refreshed',
      'settings.update': 'Settings Updated',
      'widget.update': 'Widget Updated',
    };
    return labels[action] || action;
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
        <p>Loading system status...</p>
      </div>
    );
  }

  if (!systemStatus) {
    return (
      <div style={{ padding: 'var(--space-xl)' }}>
        <p style={{ color: 'var(--admin-error)' }}>Failed to load system status</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-xl)' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-xl)',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 600,
              color: 'var(--admin-text-primary)',
              marginBottom: 'var(--space-sm)',
            }}
          >
            System Status
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)' }}>
            Monitor mirror health and system performance
          </p>
        </div>
        <button
          onClick={handleForceRefresh}
          disabled={refreshing}
          style={{
            padding: 'var(--space-sm) var(--space-lg)',
            background: 'var(--admin-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 500,
            cursor: refreshing ? 'not-allowed' : 'pointer',
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          {refreshing ? '⟳ Refreshing...' : '⟳ Force Refresh'}
        </button>
      </div>

      {/* Status Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 'var(--space-lg)',
          marginBottom: 'var(--space-xl)',
        }}
      >
        {/* Mirror Status Card */}
        <div
          style={{
            padding: 'var(--space-lg)',
            background: 'var(--admin-card-bg)',
            border: '1px solid var(--admin-border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              color: 'var(--admin-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 'var(--space-md)',
            }}
          >
            Mirror Status
          </h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-md)',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: systemStatus.status.online
                  ? 'var(--admin-success)'
                  : 'var(--admin-error)',
              }}
            />
            <span
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 600,
                color: 'var(--admin-text-primary)',
              }}
            >
              {systemStatus.status.online ? 'Online' : 'Offline'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--admin-text-secondary)' }}
              >
                Uptime
              </span>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--admin-text-primary)' }}>
                {formatUptime(systemStatus.status.uptime)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--admin-text-secondary)' }}
              >
                Last Ping
              </span>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--admin-text-primary)' }}>
                {new Date(systemStatus.status.lastPing).toLocaleTimeString('en-US')}
              </span>
            </div>
          </div>
        </div>

        {/* System Metrics Card */}
        <div
          style={{
            padding: 'var(--space-lg)',
            background: 'var(--admin-card-bg)',
            border: '1px solid var(--admin-border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              color: 'var(--admin-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 'var(--space-md)',
            }}
          >
            System Metrics
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
            >
              <span
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--admin-text-secondary)' }}
              >
                Memory
              </span>
              <span
                style={{
                  fontSize: 'var(--font-size-lg)',
                  fontWeight: 600,
                  color: 'var(--admin-text-primary)',
                }}
              >
                {systemStatus.status.memoryUsage} MB
              </span>
            </div>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
            >
              <span
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--admin-text-secondary)' }}
              >
                CPU Load
              </span>
              <span
                style={{
                  fontSize: 'var(--font-size-lg)',
                  fontWeight: 600,
                  color: 'var(--admin-text-primary)',
                }}
              >
                {systemStatus.status.cpuUsage}
              </span>
            </div>
          </div>
        </div>

        {/* Config Version Card */}
        <div
          style={{
            padding: 'var(--space-lg)',
            background: 'var(--admin-card-bg)',
            border: '1px solid var(--admin-border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              color: 'var(--admin-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 'var(--space-md)',
            }}
          >
            Configuration
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
            >
              <span
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--admin-text-secondary)' }}
              >
                Version
              </span>
              <span
                style={{
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 600,
                  color: 'var(--admin-text-primary)',
                }}
              >
                {systemStatus.config.version}
              </span>
            </div>
            {systemStatus.config.lastUpdated && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span
                  style={{ fontSize: 'var(--font-size-sm)', color: 'var(--admin-text-secondary)' }}
                >
                  Last Updated
                </span>
                <span
                  style={{ fontSize: 'var(--font-size-sm)', color: 'var(--admin-text-primary)' }}
                >
                  {new Date(systemStatus.config.lastUpdated).toLocaleTimeString('en-US')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Widgets Card */}
        <div
          style={{
            padding: 'var(--space-lg)',
            background: 'var(--admin-card-bg)',
            border: '1px solid var(--admin-border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              color: 'var(--admin-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 'var(--space-md)',
            }}
          >
            Widgets
          </h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-xs)' }}>
            <span
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 600,
                color: 'var(--admin-text-primary)',
              }}
            >
              {systemStatus.widgets.enabled}
            </span>
            <span style={{ fontSize: 'var(--font-size-lg)', color: 'var(--admin-text-secondary)' }}>
              / {systemStatus.widgets.total}
            </span>
          </div>
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--admin-text-tertiary)',
              marginTop: 'var(--space-xs)',
            }}
          >
            widgets enabled
          </p>
        </div>
      </div>

      {/* Recent Activity Log */}
      <div
        style={{
          background: 'var(--admin-card-bg)',
          border: '1px solid var(--admin-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-lg)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 600,
            color: 'var(--admin-text-primary)',
            marginBottom: 'var(--space-lg)',
          }}
        >
          Recent Activity
        </h2>

        {systemStatus.recentActivity.length === 0 ? (
          <p
            style={{
              color: 'var(--admin-text-tertiary)',
              textAlign: 'center',
              padding: 'var(--space-lg)',
            }}
          >
            No recent activity
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: 'var(--space-sm)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 500,
                      color: 'var(--admin-text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Action
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: 'var(--space-sm)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 500,
                      color: 'var(--admin-text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    User
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: 'var(--space-sm)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 500,
                      color: 'var(--admin-text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {systemStatus.recentActivity.map((activity) => (
                  <tr key={activity.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <td style={{ padding: 'var(--space-sm)', color: 'var(--admin-text-primary)' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{formatActionLabel(activity.action)}</div>
                        <div
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--admin-text-tertiary)',
                          }}
                        >
                          {activity.category}
                        </div>
                      </div>
                    </td>
                    <td
                      style={{ padding: 'var(--space-sm)', color: 'var(--admin-text-secondary)' }}
                    >
                      {activity.user}
                    </td>
                    <td
                      style={{ padding: 'var(--space-sm)', color: 'var(--admin-text-secondary)' }}
                    >
                      {new Date(activity.createdAt).toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}
