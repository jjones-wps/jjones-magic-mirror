/**
 * Unit Tests for Calendar Validation API Route
 *
 * Tests POST endpoint for validating iCal URLs
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/auth/server', () => ({
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('node-ical', () => ({
  async: {
    fromURL: jest.fn(),
  },
}));

import { POST } from '@/app/api/admin/calendar/validate/route';
import { auth } from '@/lib/auth/server';
import ical from 'node-ical';

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockFromURL = ical.async.fromURL as jest.MockedFunction<typeof ical.async.fromURL>;

describe('POST /api/admin/calendar/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/calendar/validate', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/calendar.ics' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  test('returns 400 when URL is missing', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/calendar/validate', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'URL is required' });
  });

  test('returns 400 when URL format is invalid', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/calendar/validate', {
      method: 'POST',
      body: JSON.stringify({ url: 'not-a-valid-url' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Invalid URL format' });
  });

  test('successfully validates iCal feed and returns event count', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    const mockEvents = {
      event1: { type: 'VEVENT', summary: 'Test Event 1' },
      event2: { type: 'VEVENT', summary: 'Test Event 2' },
      event3: { type: 'VTIMEZONE', summary: 'Timezone' },
    };
    mockFromURL.mockResolvedValue(mockEvents as any);

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/calendar/validate', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/calendar.ics' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      valid: true,
      eventCount: 2, // Only VEVENT types counted
      message: 'Successfully parsed 2 events',
    });

    expect(mockFromURL).toHaveBeenCalledWith('https://example.com/calendar.ics');
  });

  test('returns user-friendly error for network timeout', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    mockFromURL.mockRejectedValue(new Error('ETIMEDOUT'));

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/calendar/validate', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/calendar.ics' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      valid: false,
      error: 'Could not reach the calendar URL. Check the URL and your network connection.',
    });
  });

  test('returns user-friendly error for 404', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    mockFromURL.mockRejectedValue(new Error('404'));

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/calendar/validate', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/calendar.ics' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      valid: false,
      error: 'Calendar feed not found (404). Check the URL.',
    });
  });

  test('returns user-friendly error for 401/403', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    mockFromURL.mockRejectedValue(new Error('403 Forbidden'));

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/calendar/validate', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/calendar.ics' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      valid: false,
      error: 'Access denied. The calendar URL may be private or require authentication.',
    });
  });

  test('returns user-friendly error for invalid iCal format', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    mockFromURL.mockRejectedValue(new Error('Invalid iCal parse error'));

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/calendar/validate', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/calendar.ics' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      valid: false,
      error: 'The URL does not contain a valid iCal feed.',
    });
  });

  test('returns generic error for unknown parsing errors', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
    } as any);

    mockFromURL.mockRejectedValue(new Error('Some other error'));

    const request = new (global.NextRequest as any)('http://localhost:3000/api/admin/calendar/validate', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/calendar.ics' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      valid: false,
      error: 'Some other error',
    });
  });
});
