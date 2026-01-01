/**
 * Tests for Feast Day API route
 * @jest-environment @edge-runtime/jest-environment
 */

import { GET } from '@/app/api/feast-day/route';

// Mock romcal
jest.mock('romcal', () => ({
  Calendar: {
    calendarFor: jest.fn(),
  },
}));

import { Calendar } from 'romcal';

describe('GET /api/feast-day', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return feast day data for today', async () => {
    const today = new Date('2024-01-15T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(today);

    const mockCalendar = [
      {
        moment: '2024-01-15T00:00:00.000Z',
        name: 'Memorial of Saint John',
        type: 'MEMORIAL',
        data: {
          season: { value: 'Ordinary Time' },
          meta: { liturgicalColor: { key: 'GREEN' } },
        },
      },
    ];

    (Calendar.calendarFor as jest.Mock).mockReturnValue(mockCalendar);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      feastDay: 'Memorial of Saint John',
      season: 'Ordinary Time',
      color: 'green',
      rank: 'Memorial',
      lastUpdated: expect.any(String),
    });

    expect(Calendar.calendarFor).toHaveBeenCalledWith({
      year: 2024,
      country: 'unitedStates',
      locale: 'en',
    });

    jest.useRealTimers();
  });

  it('should return null values when no entry found for today', async () => {
    const today = new Date('2024-01-15T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(today);

    const mockCalendar = [
      {
        moment: '2024-01-16T00:00:00.000Z', // Different day
        name: 'Some Other Day',
        type: 'FEAST',
      },
    ];

    (Calendar.calendarFor as jest.Mock).mockReturnValue(mockCalendar);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      feastDay: null,
      season: null,
      color: null,
      rank: null,
      lastUpdated: expect.any(String),
    });

    jest.useRealTimers();
  });

  it('should format rank correctly for SOLEMNITY', async () => {
    const today = new Date('2024-12-25T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(today);

    const mockCalendar = [
      {
        moment: '2024-12-25T00:00:00.000Z',
        name: 'The Nativity of the Lord',
        type: 'SOLEMNITY',
        data: {
          season: { value: 'Christmas' },
          meta: { liturgicalColor: { key: 'WHITE' } },
        },
      },
    ];

    (Calendar.calendarFor as jest.Mock).mockReturnValue(mockCalendar);

    const response = await GET();
    const data = await response.json();

    expect(data.rank).toBe('Solemnity');

    jest.useRealTimers();
  });

  it('should format rank correctly for FEAST', async () => {
    const mockCalendar = [
      {
        moment: new Date().toISOString(),
        name: 'Feast Day',
        type: 'FEAST',
      },
    ];

    (Calendar.calendarFor as jest.Mock).mockReturnValue(mockCalendar);

    const response = await GET();
    const data = await response.json();

    expect(data.rank).toBe('Feast');
  });

  it('should format rank correctly for OPT_MEMORIAL', async () => {
    const mockCalendar = [
      {
        moment: new Date().toISOString(),
        name: 'Optional Memorial',
        type: 'OPT_MEMORIAL',
      },
    ];

    (Calendar.calendarFor as jest.Mock).mockReturnValue(mockCalendar);

    const response = await GET();
    const data = await response.json();

    expect(data.rank).toBe('Optional Memorial');
  });

  it('should format rank correctly for FERIA', async () => {
    const mockCalendar = [
      {
        moment: new Date().toISOString(),
        name: 'Weekday',
        type: 'FERIA',
      },
    ];

    (Calendar.calendarFor as jest.Mock).mockReturnValue(mockCalendar);

    const response = await GET();
    const data = await response.json();

    expect(data.rank).toBe('Weekday');
  });

  it('should convert liturgical color to lowercase', async () => {
    const mockCalendar = [
      {
        moment: new Date().toISOString(),
        name: 'Test Feast',
        type: 'FEAST',
        data: {
          meta: { liturgicalColor: { key: 'RED' } },
        },
      },
    ];

    (Calendar.calendarFor as jest.Mock).mockReturnValue(mockCalendar);

    const response = await GET();
    const data = await response.json();

    expect(data.color).toBe('red');
  });

  it('should handle missing optional fields gracefully', async () => {
    const mockCalendar = [
      {
        moment: new Date().toISOString(),
        name: 'Minimal Entry',
        // No type, season, or color
      },
    ];

    (Calendar.calendarFor as jest.Mock).mockReturnValue(mockCalendar);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.feastDay).toBe('Minimal Entry');
    expect(data.season).toBeNull();
    expect(data.color).toBeNull();
    expect(data.rank).toBeNull();
  });

  it('should handle romcal errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    (Calendar.calendarFor as jest.Mock).mockImplementation(() => {
      throw new Error('Romcal error');
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      feastDay: null,
      season: null,
      color: null,
      rank: null,
      lastUpdated: expect.any(String),
    });

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('should include lastUpdated timestamp', async () => {
    const mockCalendar = [
      {
        moment: new Date().toISOString(),
        name: 'Test',
        type: 'MEMORIAL',
      },
    ];

    (Calendar.calendarFor as jest.Mock).mockReturnValue(mockCalendar);

    const before = new Date();
    const response = await GET();
    const data = await response.json();
    const after = new Date();

    const lastUpdated = new Date(data.lastUpdated);
    expect(lastUpdated.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(lastUpdated.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should match today using date string comparison', async () => {
    const today = new Date('2024-03-17T18:30:00Z'); // St. Patrick's Day
    jest.useFakeTimers();
    jest.setSystemTime(today);

    const mockCalendar = [
      {
        moment: '2024-03-17T00:00:00.000Z',
        name: 'Saint Patrick',
        type: 'SOLEMNITY',
      },
      {
        moment: '2024-03-18T00:00:00.000Z',
        name: 'Different Day',
        type: 'MEMORIAL',
      },
    ];

    (Calendar.calendarFor as jest.Mock).mockReturnValue(mockCalendar);

    const response = await GET();
    const data = await response.json();

    // Should match March 17, not March 18
    expect(data.feastDay).toBe('Saint Patrick');

    jest.useRealTimers();
  });
});
