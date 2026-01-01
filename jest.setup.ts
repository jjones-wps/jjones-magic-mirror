import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.AUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.DATABASE_URL = 'file:./test.db';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  useSearchParams() {
    return {
      get: jest.fn(),
    };
  },
  usePathname() {
    return '/';
  },
}));

// Mock framer-motion for simpler testing
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    h1: 'h1',
    h2: 'h2',
    p: 'p',
    ellipse: 'ellipse',
    // SVG elements for WeatherIcons
    svg: 'svg',
    circle: 'circle',
    path: 'path',
    line: 'line',
    g: 'g',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));
