import '@testing-library/jest-dom';

// Polyfill Web APIs for Next.js API route testing
global.Request = class Request {
  constructor(public url: string, public init?: any) {}
  async json() {
    return JSON.parse(this.init?.body || '{}');
  }
} as any;

global.Response = class Response {
  constructor(public body?: any, public init?: any) {}
  get status() {
    return this.init?.status || 200;
  }
  get ok() {
    return this.status >= 200 && this.status < 300;
  }
  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
  }

  // Static method for NextResponse.json()
  static json(data: any, init?: any) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  }
} as any;

// NextRequest polyfill (extends Request)
global.NextRequest = class NextRequest extends (global.Request as any) {
  constructor(url: string, init?: any) {
    super(url, init);
  }
} as any;

global.Headers = class Headers {
  private headers: Map<string, string> = new Map();
  constructor(init?: any) {
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this.headers.set(key.toLowerCase(), String(value));
      });
    }
  }
  get(name: string) {
    return this.headers.get(name.toLowerCase()) || null;
  }
  set(name: string, value: string) {
    this.headers.set(name.toLowerCase(), value);
  }
  has(name: string) {
    return this.headers.has(name.toLowerCase());
  }
  delete(name: string) {
    this.headers.delete(name.toLowerCase());
  }
} as any;

// Mock environment variables for tests
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.AUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.DATABASE_URL = 'file:./test.db';

// Mock next/server for API route testing
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: any) => ({
      status: init?.status || 200,
      ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
      json: async () => data,
      headers: new (global.Headers as any)(init?.headers || {}),
    }),
  },
  NextRequest: global.NextRequest,
}));

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
