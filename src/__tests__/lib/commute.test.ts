/**
 * Tests for Commute utility functions
 */

import {
  getTrafficStatus,
  calculateDepartureTime,
  formatDuration,
  formatDistance,
  metersToMiles,
  isWorkdayMorning,
  getTrafficLabel,
  getDemoCommuteData,
  buildTomTomUrl,
  parseTomTomResponse,
  type TomTomRouteResponse,
} from '@/lib/commute';

describe('getTrafficStatus', () => {
  it('should return light for delays under 10%', () => {
    expect(getTrafficStatus(2, 30)).toBe('light'); // 6.7%
    expect(getTrafficStatus(5, 60)).toBe('light'); // 8.3%
  });

  it('should return moderate for delays 10-25%', () => {
    expect(getTrafficStatus(5, 30)).toBe('moderate'); // 16.7%
    expect(getTrafficStatus(12, 60)).toBe('moderate'); // 20%
  });

  it('should return heavy for delays over 25%', () => {
    expect(getTrafficStatus(10, 30)).toBe('heavy'); // 33.3%
    expect(getTrafficStatus(30, 60)).toBe('heavy'); // 50%
  });

  it('should handle zero total minutes', () => {
    expect(getTrafficStatus(5, 0)).toBe('light');
  });

  it('should handle zero delay', () => {
    expect(getTrafficStatus(0, 30)).toBe('light');
  });
});

describe('calculateDepartureTime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should calculate departure time for morning arrival', () => {
    const result = calculateDepartureTime('08:00', 25);
    expect(result.getHours()).toBe(7);
    expect(result.getMinutes()).toBe(35);
  });

  it('should calculate departure time for afternoon arrival', () => {
    const result = calculateDepartureTime('17:30', 45);
    expect(result.getHours()).toBe(16);
    expect(result.getMinutes()).toBe(45);
  });

  it('should handle arrival time crossing midnight', () => {
    const result = calculateDepartureTime('00:15', 30);
    expect(result.getDate()).toBe(14); // Previous day
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(45);
  });

  it('should handle single-digit hours and minutes', () => {
    const result = calculateDepartureTime('9:5', 10);
    expect(result.getHours()).toBe(8);
    expect(result.getMinutes()).toBe(55);
  });
});

describe('formatDuration', () => {
  it('should format minutes under 1 hour', () => {
    expect(formatDuration(15)).toBe('15 min');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(59)).toBe('59 min');
  });

  it('should format exact hours', () => {
    expect(formatDuration(60)).toBe('1 hr');
    expect(formatDuration(120)).toBe('2 hr');
  });

  it('should format hours and minutes', () => {
    expect(formatDuration(75)).toBe('1 hr 15 min');
    expect(formatDuration(125)).toBe('2 hr 5 min');
  });

  it('should round minutes', () => {
    expect(formatDuration(24.6)).toBe('25 min');
    expect(formatDuration(90.4)).toBe('1 hr 30 min');
  });

  it('should handle zero', () => {
    expect(formatDuration(0)).toBe('0 min');
  });
});

describe('formatDistance', () => {
  it('should format distance with one decimal', () => {
    expect(formatDistance(12.34)).toBe('12.3 mi');
    expect(formatDistance(5.67)).toBe('5.7 mi');
  });

  it('should round to one decimal', () => {
    expect(formatDistance(12.36)).toBe('12.4 mi');
    expect(formatDistance(5.65)).toBe('5.7 mi');
  });

  it('should handle whole numbers', () => {
    expect(formatDistance(10)).toBe('10.0 mi');
  });

  it('should handle zero', () => {
    expect(formatDistance(0)).toBe('0.0 mi');
  });
});

describe('metersToMiles', () => {
  it('should convert meters to miles correctly', () => {
    expect(metersToMiles(1609.344)).toBeCloseTo(1, 5);
    expect(metersToMiles(8046.72)).toBeCloseTo(5, 5);
  });

  it('should handle zero', () => {
    expect(metersToMiles(0)).toBe(0);
  });

  it('should handle decimal meters', () => {
    expect(metersToMiles(804.672)).toBeCloseTo(0.5, 5);
  });
});

describe('isWorkdayMorning', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return true for weekday mornings (6-9 AM)', () => {
    // Monday 7 AM
    jest.setSystemTime(new Date('2024-01-15T07:00:00'));
    expect(isWorkdayMorning()).toBe(true);

    // Wednesday 8:30 AM
    jest.setSystemTime(new Date('2024-01-17T08:30:00'));
    expect(isWorkdayMorning()).toBe(true);

    // Friday 8:59 AM
    jest.setSystemTime(new Date('2024-01-19T08:59:00'));
    expect(isWorkdayMorning()).toBe(true);
  });

  it('should return false for weekday non-morning hours', () => {
    // Monday 5 AM
    jest.setSystemTime(new Date('2024-01-15T05:00:00'));
    expect(isWorkdayMorning()).toBe(false);

    // Monday 9 AM
    jest.setSystemTime(new Date('2024-01-15T09:00:00'));
    expect(isWorkdayMorning()).toBe(false);

    // Monday 12 PM
    jest.setSystemTime(new Date('2024-01-15T12:00:00'));
    expect(isWorkdayMorning()).toBe(false);
  });

  it('should return false for weekend mornings', () => {
    // Saturday 7 AM
    jest.setSystemTime(new Date('2024-01-20T07:00:00'));
    expect(isWorkdayMorning()).toBe(false);

    // Sunday 8 AM
    jest.setSystemTime(new Date('2024-01-21T08:00:00'));
    expect(isWorkdayMorning()).toBe(false);
  });

  it('should return true when alwaysShow is true', () => {
    // Sunday midnight
    jest.setSystemTime(new Date('2024-01-21T00:00:00'));
    expect(isWorkdayMorning(true)).toBe(true);

    // Saturday noon
    jest.setSystemTime(new Date('2024-01-20T12:00:00'));
    expect(isWorkdayMorning(true)).toBe(true);
  });
});

describe('getTrafficLabel', () => {
  it('should return correct labels for each status', () => {
    expect(getTrafficLabel('light')).toBe('Light traffic');
    expect(getTrafficLabel('moderate')).toBe('Moderate traffic');
    expect(getTrafficLabel('heavy')).toBe('Heavy traffic');
  });
});

describe('getDemoCommuteData', () => {
  it('should return demo data with correct structure', () => {
    const data = getDemoCommuteData();

    expect(data).toHaveProperty('commutes');
    expect(data).toHaveProperty('lastUpdated');
    expect(data).toHaveProperty('isDemo', true);
    expect(data.commutes).toHaveLength(2);
  });

  it('should include Jack and Lauren commutes', () => {
    const data = getDemoCommuteData();

    expect(data.commutes[0].name).toBe('Jack');
    expect(data.commutes[1].name).toBe('Lauren');
  });

  it('should have valid commute data', () => {
    const data = getDemoCommuteData();
    const jack = data.commutes[0];

    expect(jack.durationMinutes).toBeGreaterThan(0);
    expect(jack.distanceMiles).toBeGreaterThan(0);
    expect(jack.trafficDelayMinutes).toBeGreaterThanOrEqual(0);
    expect(['light', 'moderate', 'heavy']).toContain(jack.trafficStatus);
    expect(jack.suggestedDepartureTime).toBeDefined();
    expect(jack.targetArrivalTime).toBe('08:30');
  });
});

describe('buildTomTomUrl', () => {
  it('should build correct TomTom API URL', () => {
    const url = buildTomTomUrl('41.0793,-85.1394', '41.1327,-85.1762', 'test-api-key');

    expect(url).toContain('https://api.tomtom.com/routing/1/calculateRoute');
    expect(url).toContain('41.0793%2C-85.1394:41.1327%2C-85.1762');
    expect(url).toContain('key=test-api-key');
    expect(url).toContain('traffic=true');
    expect(url).toContain('travelMode=car');
    expect(url).toContain('routeType=fastest');
  });

  it('should encode special characters in coordinates', () => {
    const url = buildTomTomUrl('41.0793,-85.1394', '41.1327,-85.1762', 'key-with-special#chars');

    expect(url).toContain('41.0793%2C-85.1394');
    expect(url).toContain('41.1327%2C-85.1762');
  });
});

describe('parseTomTomResponse', () => {
  const mockResponse: TomTomRouteResponse = {
    routes: [
      {
        summary: {
          lengthInMeters: 20116,
          travelTimeInSeconds: 1500,
          trafficDelayInSeconds: 300,
          departureTime: '2024-01-15T07:35:00Z',
          arrivalTime: '2024-01-15T08:00:00Z',
        },
      },
    ],
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T07:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should parse TomTom response correctly', () => {
    const result = parseTomTomResponse(mockResponse, 'Jack', '08:00');

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Jack');
    expect(result!.targetArrivalTime).toBe('08:00');
  });

  it('should convert metrics correctly', () => {
    const result = parseTomTomResponse(mockResponse, 'Jack', '08:00');

    expect(result!.durationMinutes).toBe(25); // 1500 seconds
    expect(result!.distanceMiles).toBeCloseTo(12.5, 1); // 20116 meters
    expect(result!.trafficDelayMinutes).toBe(5); // 300 seconds
  });

  it('should calculate traffic status', () => {
    const result = parseTomTomResponse(mockResponse, 'Jack', '08:00');

    expect(result!.trafficStatus).toBe('moderate'); // 5 min delay / 25 min total = 20%
  });

  it('should calculate suggested departure time', () => {
    const result = parseTomTomResponse(mockResponse, 'Jack', '08:00');

    expect(result!.suggestedDepartureTime.getHours()).toBe(7);
    expect(result!.suggestedDepartureTime.getMinutes()).toBe(35);
  });

  it('should return null for empty routes array', () => {
    const emptyResponse: TomTomRouteResponse = { routes: [] };
    const result = parseTomTomResponse(emptyResponse, 'Jack', '08:00');

    expect(result).toBeNull();
  });

  it('should return null for missing routes property', () => {
    const invalidResponse = {} as TomTomRouteResponse;
    const result = parseTomTomResponse(invalidResponse, 'Jack', '08:00');

    expect(result).toBeNull();
  });
});
