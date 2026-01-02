'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check for error from NextAuth
  const authError = searchParams.get('error');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        setLoading(false);
      } else if (result?.ok) {
        router.push('/admin');
        router.refresh();
      }
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div
      className="admin-animate-in"
      style={{
        width: '100%',
        maxWidth: '400px',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: 'var(--space-2xl)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #fff 0%, #666 100%)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-lg)',
            boxShadow: '0 8px 32px rgba(255,255,255,0.1)',
          }}
        >
          <span style={{ fontSize: '28px', color: '#000' }}>◈</span>
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '1.5rem',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            marginBottom: 'var(--space-xs)',
          }}
        >
          Magic Mirror
        </h1>
        <span className="admin-label">Control Panel</span>
      </div>

      {/* Login Card */}
      <div
        className="admin-card"
        style={{
          padding: 'var(--space-xl)',
        }}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label
              className="admin-label"
              style={{
                display: 'block',
                marginBottom: 'var(--space-sm)',
              }}
            >
              Email
            </label>
            <input
              type="email"
              className="admin-input"
              placeholder="admin@mirror.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{ fontSize: '1rem' }}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <label
              className="admin-label"
              style={{
                display: 'block',
                marginBottom: 'var(--space-sm)',
              }}
            >
              Password
            </label>
            <input
              type="password"
              className="admin-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{ fontSize: '1rem' }}
            />
          </div>

          {(error || authError) && (
            <div
              style={{
                padding: 'var(--space-md)',
                marginBottom: 'var(--space-lg)',
                background: 'var(--admin-error-muted)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--admin-error)',
                fontSize: '0.875rem',
                textAlign: 'center',
              }}
            >
              {error || 'Authentication failed. Please try again.'}
            </div>
          )}

          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: 'var(--space-md)',
              fontSize: '1rem',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    animation: 'spin 1s linear infinite',
                  }}
                >
                  ◌
                </span>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>

      {/* Security Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-sm)',
          marginTop: 'var(--space-xl)',
          color: 'var(--admin-text-muted)',
          fontSize: '0.75rem',
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <span>Secured with JWT Authentication</span>
      </div>

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
