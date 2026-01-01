/**
 * Tests for Version API route
 * @jest-environment @edge-runtime/jest-environment
 */

import { GET } from '@/app/api/version/route';

describe('GET /api/version', () => {
  const originalEnv = process.env.BUILD_TIME;

  afterEach(() => {
    process.env.BUILD_TIME = originalEnv;
  });

  it('should return build time and timestamp', async () => {
    process.env.BUILD_TIME = '2024-01-15T12:00:00Z';

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('buildTime', '2024-01-15T12:00:00Z');
    expect(data).toHaveProperty('timestamp');
    expect(typeof data.timestamp).toBe('number');
  });

  it('should return "development" when BUILD_TIME is not set', async () => {
    delete process.env.BUILD_TIME;

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.buildTime).toBe('development');
  });

  it('should return current timestamp', async () => {
    const before = Date.now();
    const response = await GET();
    const data = await response.json();
    const after = Date.now();

    expect(data.timestamp).toBeGreaterThanOrEqual(before);
    expect(data.timestamp).toBeLessThanOrEqual(after);
  });
});
