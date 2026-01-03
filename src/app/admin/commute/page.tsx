'use client';

import { useState, useEffect } from 'react';
import { useToast, ToastContainer } from '@/components/admin/Toast';

interface CommuteRoute {
  id: string;
  name: string;
  originLat: number;
  originLon: number;
  destLat: number;
  destLon: number;
  arrivalTime: string;
  daysActive: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export default function CommuteRoutesPage() {
  const [routes, setRoutes] = useState<CommuteRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const { toasts, closeToast, success, error } = useToast();

  // New route form state
  const [newRoute, setNewRoute] = useState({
    name: '',
    originLat: '',
    originLon: '',
    destLat: '',
    destLon: '',
    arrivalTime: '08:00',
    daysActive: [1, 2, 3, 4, 5], // Default to weekdays
  });

  // Fetch routes on mount
  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/commute');
      if (!response.ok) {
        throw new Error('Failed to fetch commute routes');
      }
      const data = await response.json();
      setRoutes(data.routes);
    } catch (err) {
      error('Failed to load routes', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoute = async () => {
    try {
      setSaving(true);

      // Validate form
      if (!newRoute.name.trim()) {
        throw new Error('Route name is required');
      }
      if (!newRoute.originLat || !newRoute.originLon || !newRoute.destLat || !newRoute.destLon) {
        throw new Error('All coordinates are required');
      }
      if (newRoute.daysActive.length === 0) {
        throw new Error('At least one day must be selected');
      }

      const response = await fetch('/api/admin/commute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRoute,
          daysActive: newRoute.daysActive.sort().join(','),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add commute route');
      }

      const data = await response.json();
      setRoutes((prevRoutes) => [...prevRoutes, data.route]);
      setShowAddModal(false);
      setNewRoute({
        name: '',
        originLat: '',
        originLon: '',
        destLat: '',
        destLon: '',
        arrivalTime: '08:00',
        daysActive: [1, 2, 3, 4, 5],
      });
      success('Route added', 'Commute route added successfully');
    } catch (err) {
      error('Failed to add route', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRoute = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/commute', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routes: [{ id, enabled }],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update route');
      }

      setRoutes((prevRoutes) =>
        prevRoutes.map((route) => (route.id === id ? { ...route, enabled } : route))
      );
      success('Route updated', `Route ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (err) {
      error('Failed to update route', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!confirm('Are you sure you want to delete this commute route?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/commute/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete route');
      }

      setRoutes((prevRoutes) => prevRoutes.filter((route) => route.id !== id));
      success('Route deleted', 'Commute route deleted successfully');
    } catch (err) {
      error('Failed to delete route', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const toggleDay = (day: number) => {
    setNewRoute((prev) => ({
      ...prev,
      daysActive: prev.daysActive.includes(day)
        ? prev.daysActive.filter((d) => d !== day)
        : [...prev.daysActive, day],
    }));
  };

  const formatDaysActive = (daysActive: string) => {
    const days = daysActive.split(',').map((d) => parseInt(d.trim()));
    return DAYS_OF_WEEK.filter((day) => days.includes(day.value))
      .map((day) => day.label)
      .join(', ');
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
        <p>Loading commute routes...</p>
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
            Commute Routes
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)' }}>
            Configure traffic-aware commute routes for the mirror display
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: 'var(--space-sm) var(--space-lg)',
            background: 'var(--admin-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          + Add Route
        </button>
      </div>

      {/* Routes List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {routes.length === 0 ? (
          <div
            style={{
              padding: 'var(--space-xl)',
              background: 'var(--admin-card-bg)',
              border: '1px solid var(--admin-border)',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
              color: 'var(--admin-text-secondary)',
            }}
          >
            No commute routes configured. Click &quot;Add Route&quot; to get started.
          </div>
        ) : (
          routes.map((route) => (
            <div
              key={route.id}
              style={{
                padding: 'var(--space-lg)',
                background: 'var(--admin-card-bg)',
                border: '1px solid var(--admin-border)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 'var(--space-sm)' }}>
                  <h3
                    style={{
                      fontSize: 'var(--font-size-lg)',
                      fontWeight: 600,
                      color: 'var(--admin-text-primary)',
                      marginBottom: 'var(--space-xs)',
                    }}
                  >
                    {route.name}
                  </h3>
                  <p
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--admin-text-secondary)',
                    }}
                  >
                    Arrival Time: {route.arrivalTime}
                  </p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--space-md)',
                    marginBottom: 'var(--space-sm)',
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--admin-text-tertiary)',
                      }}
                    >
                      Origin
                    </p>
                    <p
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--admin-text-secondary)',
                      }}
                    >
                      {route.originLat.toFixed(4)}, {route.originLon.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--admin-text-tertiary)',
                      }}
                    >
                      Destination
                    </p>
                    <p
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--admin-text-secondary)',
                      }}
                    >
                      {route.destLat.toFixed(4)}, {route.destLon.toFixed(4)}
                    </p>
                  </div>
                </div>

                <div>
                  <p
                    style={{ fontSize: 'var(--font-size-xs)', color: 'var(--admin-text-tertiary)' }}
                  >
                    Active Days
                  </p>
                  <p
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--admin-text-secondary)',
                    }}
                  >
                    {formatDaysActive(route.daysActive)}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-xs)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={route.enabled}
                    onChange={(e) => handleToggleRoute(route.id, e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span
                    style={{
                      color: 'var(--admin-text-secondary)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    Enabled
                  </span>
                </label>

                <button
                  onClick={() => handleDeleteRoute(route.id)}
                  style={{
                    padding: 'var(--space-xs) var(--space-sm)',
                    background: 'transparent',
                    color: 'var(--admin-error)',
                    border: '1px solid var(--admin-error)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Route Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: 'var(--admin-bg)',
              border: '1px solid var(--admin-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-xl)',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: 'var(--font-size-xl)',
                fontWeight: 600,
                color: 'var(--admin-text-primary)',
                marginBottom: 'var(--space-lg)',
              }}
            >
              Add Commute Route
            </h2>

            {/* Route Name */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label
                htmlFor="routeName"
                style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 500,
                  color: 'var(--admin-text-primary)',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                Route Name
              </label>
              <input
                id="routeName"
                type="text"
                value={newRoute.name}
                onChange={(e) => setNewRoute((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Jack, Lauren"
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
            </div>

            {/* Origin Coordinates */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <p
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 500,
                  color: 'var(--admin-text-primary)',
                  marginBottom: 'var(--space-sm)',
                }}
              >
                Origin Coordinates
              </p>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}
              >
                <div>
                  <label
                    htmlFor="originLat"
                    style={{
                      display: 'block',
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--admin-text-secondary)',
                      marginBottom: 'var(--space-xs)',
                    }}
                  >
                    Latitude
                  </label>
                  <input
                    id="originLat"
                    type="text"
                    value={newRoute.originLat}
                    onChange={(e) =>
                      setNewRoute((prev) => ({ ...prev, originLat: e.target.value }))
                    }
                    placeholder="41.0454"
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
                </div>
                <div>
                  <label
                    htmlFor="originLon"
                    style={{
                      display: 'block',
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--admin-text-secondary)',
                      marginBottom: 'var(--space-xs)',
                    }}
                  >
                    Longitude
                  </label>
                  <input
                    id="originLon"
                    type="text"
                    value={newRoute.originLon}
                    onChange={(e) =>
                      setNewRoute((prev) => ({ ...prev, originLon: e.target.value }))
                    }
                    placeholder="-85.1455"
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
                </div>
              </div>
            </div>

            {/* Destination Coordinates */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <p
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 500,
                  color: 'var(--admin-text-primary)',
                  marginBottom: 'var(--space-sm)',
                }}
              >
                Destination Coordinates
              </p>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}
              >
                <div>
                  <label
                    htmlFor="destLat"
                    style={{
                      display: 'block',
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--admin-text-secondary)',
                      marginBottom: 'var(--space-xs)',
                    }}
                  >
                    Latitude
                  </label>
                  <input
                    id="destLat"
                    type="text"
                    value={newRoute.destLat}
                    onChange={(e) => setNewRoute((prev) => ({ ...prev, destLat: e.target.value }))}
                    placeholder="41.1327"
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
                </div>
                <div>
                  <label
                    htmlFor="destLon"
                    style={{
                      display: 'block',
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--admin-text-secondary)',
                      marginBottom: 'var(--space-xs)',
                    }}
                  >
                    Longitude
                  </label>
                  <input
                    id="destLon"
                    type="text"
                    value={newRoute.destLon}
                    onChange={(e) => setNewRoute((prev) => ({ ...prev, destLon: e.target.value }))}
                    placeholder="-85.1762"
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
                </div>
              </div>
            </div>

            {/* Arrival Time */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label
                htmlFor="arrivalTime"
                style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 500,
                  color: 'var(--admin-text-primary)',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                Arrival Time
              </label>
              <input
                id="arrivalTime"
                type="time"
                value={newRoute.arrivalTime}
                onChange={(e) => setNewRoute((prev) => ({ ...prev, arrivalTime: e.target.value }))}
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
            </div>

            {/* Days Active */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <p
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 500,
                  color: 'var(--admin-text-primary)',
                  marginBottom: 'var(--space-sm)',
                }}
              >
                Active Days
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                {DAYS_OF_WEEK.map((day) => (
                  <label
                    key={day.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      cursor: 'pointer',
                      padding: 'var(--space-xs) var(--space-sm)',
                      background: newRoute.daysActive.includes(day.value)
                        ? 'var(--admin-primary-hover)'
                        : 'transparent',
                      border: `1px solid ${
                        newRoute.daysActive.includes(day.value)
                          ? 'var(--admin-primary)'
                          : 'var(--admin-border)'
                      }`,
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--admin-text-primary)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={newRoute.daysActive.includes(day.value)}
                      onChange={() => toggleDay(day.value)}
                      style={{ margin: 0 }}
                    />
                    <span>{day.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                disabled={saving}
                style={{
                  padding: 'var(--space-sm) var(--space-lg)',
                  background: 'transparent',
                  color: 'var(--admin-text-secondary)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 500,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleAddRoute}
                disabled={saving}
                style={{
                  padding: 'var(--space-sm) var(--space-lg)',
                  background: 'var(--admin-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 500,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Adding...' : 'Add Route'}
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
