import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

/**
 * Custom render function that wraps components with common providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // For now, we don't have global providers, but this is where you'd add them
  // e.g., SessionProvider, QueryClientProvider, ThemeProvider, etc.
  return render(ui, options);
}

/**
 * Mock fetch for API tests
 */
export function mockFetch(data: unknown, ok = true, status = 200) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok,
      status,
      json: async () => data,
      text: async () => JSON.stringify(data),
      headers: new Headers(),
    } as Response)
  );
}

/**
 * Wait for async updates to complete
 */
export async function waitForAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Mock console methods to avoid noise in tests
 */
export function suppressConsole() {
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeAll(() => {
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });
}

/**
 * Create a mock date that's consistent across tests
 */
export function mockDate(isoDate: string) {
  const mockNow = new Date(isoDate);
  const originalDate = Date;

  beforeAll(() => {
    global.Date = class extends Date {
      constructor() {
        super();
        return mockNow;
      }
      static now() {
        return mockNow.getTime();
      }
    } as DateConstructor;
  });

  afterAll(() => {
    global.Date = originalDate;
  });
}
