'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './globals.css';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: '◉' },
  { name: 'Widgets', href: '/admin/widgets', icon: '▦' },
  { name: 'Calendar', href: '/admin/calendar', icon: '◫' },
  { name: 'Weather', href: '/admin/weather', icon: '◐' },
  { name: 'Commute', href: '/admin/commute', icon: '→' },
  { name: 'System', href: '/admin/system', icon: '⚙' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="admin-portal">
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(10, 10, 10, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--admin-border-subtle)',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: 'var(--space-md) var(--space-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <Link
            href="/admin"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, #fff 0%, #888 100%)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '14px', color: '#000' }}>◈</span>
            </div>
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  letterSpacing: '-0.01em',
                }}
              >
                Magic Mirror
              </div>
              <div className="admin-label" style={{ marginTop: '2px' }}>
                Control Panel
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="admin-nav"
            style={{
              display: 'none',
            }}
            id="desktop-nav"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-item ${
                  pathname === item.href ? 'active' : ''
                }`}
                style={{ textDecoration: 'none' }}
              >
                <span style={{ marginRight: '6px', opacity: 0.6 }}>
                  {item.icon}
                </span>
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Mirror Status + Mobile Menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div className="admin-status">
              <span className="admin-status-dot online"></span>
              <span style={{ color: 'var(--admin-success)' }}>Online</span>
            </div>

            {/* Mobile menu button */}
            <button
              className="admin-btn admin-btn-ghost"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ padding: 'var(--space-sm)' }}
              id="mobile-menu-btn"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                {mobileMenuOpen ? (
                  <path d="M4 4l12 12M16 4L4 16" />
                ) : (
                  <path d="M3 5h14M3 10h14M3 15h14" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav
            style={{
              padding: 'var(--space-md) var(--space-lg) var(--space-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-xs)',
              borderTop: '1px solid var(--admin-border-subtle)',
            }}
            id="mobile-nav"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  color:
                    pathname === item.href
                      ? 'var(--admin-text-primary)'
                      : 'var(--admin-text-secondary)',
                  background:
                    pathname === item.href
                      ? 'var(--admin-accent-muted)'
                      : 'transparent',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <span style={{ opacity: 0.6, fontSize: '1.125rem' }}>
                  {item.icon}
                </span>
                {item.name}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '1400px',
          margin: '0 auto',
          padding: 'var(--space-xl) var(--space-lg)',
          minHeight: 'calc(100vh - 80px)',
        }}
      >
        {children}
      </main>

      {/* Show desktop nav on larger screens */}
      <style jsx global>{`
        @media (min-width: 900px) {
          #desktop-nav {
            display: flex !important;
          }
          #mobile-menu-btn {
            display: none !important;
          }
          #mobile-nav {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
