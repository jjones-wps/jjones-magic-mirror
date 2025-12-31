import { Suspense } from 'react';
import LoginForm from './LoginForm';
import '../globals.css';

export default function LoginPage() {
  return (
    <div
      className="admin-portal"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-lg)',
      }}
    >
      <Suspense
        fallback={
          <div style={{ textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            Loading...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
