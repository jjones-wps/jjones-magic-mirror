/**
 * Tests for Summary API route
 * @jest-environment node
 */

import { GET } from '@/app/api/summary/route';

// Mock fetch globally
global.fetch = jest.fn();

const mockWeatherResponse = {
  current: {
    temperature: 72,
    feelsLike: 70,
    humidity: 65,
    windSpeed: 8,
    weatherCode: 2,
    isDay: true,
  },
  daily: [
    {
      date: '2024-01-15',
      tempHigh: 75,
      tempLow: 55,
      weatherCode: 2,
      precipitationProbability: 10,
    },
  ],
  location: 'Fort Wayne, IN',
  lastUpdated: '2024-01-15T12:00:00Z',
};

const mockCalendarResponse = {
  todayEvents: [
    {
      id: 'event-1',
      title: 'Team Meeting',
      start: '2024-01-15T14:00:00Z',
      end: '2024-01-15T15:00:00Z',
      allDay: false,
      calendar: 'primary',
    },
  ],
  tomorrowEvents: [],
  upcomingEvents: [],
  lastUpdated: '2024-01-15T12:00:00Z',
};

const mockNewsResponse = {
  articles: [
    {
      id: 'article-1',
      title: 'Breaking News Story',
      source: 'BBC',
      link: 'https://example.com/article-1',
      pubDate: '2024-01-15T10:00:00Z',
      description: 'This is a test article with details',
    },
  ],
  lastUpdated: '2024-01-15T12:00:00Z',
};

const mockOpenRouterResponse = {
  choices: [
    {
      message: {
        content: 'Good morning! It looks like a pleasant day ahead with partly cloudy skies.',
      },
    },
  ],
};

describe('GET /api/summary', () => {
  const originalEnv = {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    SITE_URL: process.env.SITE_URL,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    // Restore environment variables
    Object.keys(originalEnv).forEach((key) => {
      const value = originalEnv[key as keyof typeof originalEnv];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  it('should generate template summary when OpenRouter is not configured', async () => {
    delete process.env.OPENROUTER_API_KEY;

    jest.setSystemTime(new Date('2024-01-15T10:00:00Z')); // Morning

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockWeatherResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCalendarResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockNewsResponse });

    const mockRequest = new Request('http://localhost:3000/api/summary');
    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.greeting).toBe('Good morning');
    expect(data.summary).toContain('72°');
    expect(data.summary).toContain('partly cloudy');
    expect(data.summary).toContain('1 event on your calendar today: Team Meeting');
    expect(data.lastUpdated).toBeDefined();
  });

  it('should use AI summary when OpenRouter is configured', async () => {
    process.env.OPENROUTER_API_KEY = 'test-api-key';

    jest.setSystemTime(new Date('2024-01-15T10:00:00Z')); // Morning

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockWeatherResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCalendarResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockNewsResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockOpenRouterResponse });

    const mockRequest = new Request('http://localhost:3000/api/summary');
    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.greeting).toBe('Good morning');
    expect(data.summary).toBe(
      'Good morning! It looks like a pleasant day ahead with partly cloudy skies.'
    );

    // Verify OpenRouter API was called
    const openRouterCall = (global.fetch as jest.Mock).mock.calls.find((call) =>
      call[0].includes('openrouter.ai')
    );
    expect(openRouterCall).toBeDefined();
  });

  it('should fall back to template when OpenRouter fails', async () => {
    process.env.OPENROUTER_API_KEY = 'test-api-key';

    jest.setSystemTime(new Date('2024-01-15T10:00:00Z')); // Morning

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockWeatherResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCalendarResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockNewsResponse })
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Server error' });

    const mockRequest = new Request('http://localhost:3000/api/summary');
    const response = await GET(mockRequest);
    const data = await response.json();

    expect(data.summary).toContain('72°');
    expect(data.summary).toContain('partly cloudy');
  });

  it('should return correct greeting for different times of day', async () => {
    delete process.env.OPENROUTER_API_KEY;

    const mockFetch = (global.fetch as jest.Mock);

    // Helper to set up mocks for each test
    const setupMocks = () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    };

    // Morning (5-11) - Use local time
    setupMocks();
    jest.setSystemTime(new Date('2024-01-15T10:00:00'));
    let mockRequest = new Request('http://localhost:3000/api/summary');
    let response = await GET(mockRequest);
    let data = await response.json();
    expect(data.greeting).toBe('Good morning');

    jest.clearAllMocks();

    // Afternoon (12-16) - Use local time
    setupMocks();
    jest.setSystemTime(new Date('2024-01-15T14:00:00'));
    mockRequest = new Request('http://localhost:3000/api/summary');
    response = await GET(mockRequest);
    data = await response.json();
    expect(data.greeting).toBe('Good afternoon');

    jest.clearAllMocks();

    // Evening (17-20) - Use local time
    setupMocks();
    jest.setSystemTime(new Date('2024-01-15T19:00:00'));
    mockRequest = new Request('http://localhost:3000/api/summary');
    response = await GET(mockRequest);
    data = await response.json();
    expect(data.greeting).toBe('Good evening');

    jest.clearAllMocks();

    // Night (21-4) - Use local time
    setupMocks();
    jest.setSystemTime(new Date('2024-01-15T23:00:00'));
    mockRequest = new Request('http://localhost:3000/api/summary');
    response = await GET(mockRequest);
    data = await response.json();
    expect(data.greeting).toBe('Good night');
  });

  it('should handle no events on calendar', async () => {
    delete process.env.OPENROUTER_API_KEY;

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockWeatherResponse })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockCalendarResponse, todayEvents: [] }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => mockNewsResponse });

    const mockRequest = new Request('http://localhost:3000/api/summary');
    const response = await GET(mockRequest);
    const data = await response.json();

    expect(data.summary).toContain('Your calendar is clear today');
  });

  it('should handle multiple events on calendar', async () => {
    delete process.env.OPENROUTER_API_KEY;

    const multipleEvents = {
      ...mockCalendarResponse,
      todayEvents: [
        mockCalendarResponse.todayEvents[0],
        { ...mockCalendarResponse.todayEvents[0], id: 'event-2', title: 'Lunch Meeting' },
        { ...mockCalendarResponse.todayEvents[0], id: 'event-3', title: 'Code Review' },
      ],
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockWeatherResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => multipleEvents })
      .mockResolvedValueOnce({ ok: true, json: async () => mockNewsResponse });

    const mockRequest = new Request('http://localhost:3000/api/summary');
    const response = await GET(mockRequest);
    const data = await response.json();

    expect(data.summary).toContain('You have 3 events on your calendar today');
  });

  it('should include precipitation warning when probability is high', async () => {
    delete process.env.OPENROUTER_API_KEY;

    const rainyWeather = {
      ...mockWeatherResponse,
      daily: [
        {
          ...mockWeatherResponse.daily[0],
          precipitationProbability: 80,
        },
      ],
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => rainyWeather })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCalendarResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockNewsResponse });

    const mockRequest = new Request('http://localhost:3000/api/summary');
    const response = await GET(mockRequest);
    const data = await response.json();

    expect(data.summary).toContain('80% chance of precipitation today');
  });

  it('should handle failed weather API gracefully', async () => {
    delete process.env.OPENROUTER_API_KEY;

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCalendarResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockNewsResponse });

    const mockRequest = new Request('http://localhost:3000/api/summary');
    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary).toBeDefined();
    // Should still have calendar info even without weather
    expect(data.summary).toContain('1 event');
  });

  it('should handle failed calendar API gracefully', async () => {
    delete process.env.OPENROUTER_API_KEY;

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockWeatherResponse })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: async () => mockNewsResponse });

    const mockRequest = new Request('http://localhost:3000/api/summary');
    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary).toBeDefined();
    // Should still have weather info even without calendar
    expect(data.summary).toContain('72°');
  });

  it('should include contextual tips based on weather', async () => {
    delete process.env.OPENROUTER_API_KEY;

    // Test cold weather tip
    const coldWeather = {
      ...mockWeatherResponse,
      current: { ...mockWeatherResponse.current, temperature: 25 },
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => coldWeather })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCalendarResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockNewsResponse });

    const mockRequest = new Request('http://localhost:3000/api/summary');
    const response = await GET(mockRequest);
    const data = await response.json();

    // Template includes tips in the summary
    expect(data.summary).toContain("Bundle up, it's freezing out there");
  });

  it('should send correct headers to OpenRouter', async () => {
    process.env.OPENROUTER_API_KEY = 'test-api-key';
    process.env.SITE_URL = 'http://localhost:3002';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockWeatherResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCalendarResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockNewsResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockOpenRouterResponse });

    const mockRequest = new Request('http://localhost:3000/api/summary');
    await GET(mockRequest);

    const openRouterCall = (global.fetch as jest.Mock).mock.calls.find((call) =>
      call[0].includes('openrouter.ai')
    );

    expect(openRouterCall[1].headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-api-key',
      'HTTP-Referer': 'http://localhost:3002',
      'X-Title': 'Magic Mirror',
    });
  });

  it('should use default model when not specified', async () => {
    process.env.OPENROUTER_API_KEY = 'test-api-key';
    delete process.env.OPENROUTER_MODEL;

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockWeatherResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCalendarResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockNewsResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockOpenRouterResponse });

    const mockRequest = new Request('http://localhost:3000/api/summary');
    await GET(mockRequest);

    const openRouterCall = (global.fetch as jest.Mock).mock.calls.find((call) =>
      call[0].includes('openrouter.ai')
    );

    const body = JSON.parse(openRouterCall[1].body);
    expect(body.model).toBe('anthropic/claude-3-haiku');
  });

  it('should include news descriptions in AI prompt', async () => {
    process.env.OPENROUTER_API_KEY = 'test-api-key';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockWeatherResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCalendarResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockNewsResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockOpenRouterResponse });

    const mockRequest = new Request('http://localhost:3000/api/summary');
    await GET(mockRequest);

    const openRouterCall = (global.fetch as jest.Mock).mock.calls.find((call) =>
      call[0].includes('openrouter.ai')
    );

    const body = JSON.parse(openRouterCall[1].body);
    const userMessage = body.messages.find((m: { role: string }) => m.role === 'user');

    expect(userMessage.content).toContain('Breaking News Story');
    expect(userMessage.content).toContain('This is a test article with details');
  });

  it('should include lastUpdated timestamp', async () => {
    delete process.env.OPENROUTER_API_KEY;

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockWeatherResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCalendarResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockNewsResponse });

    const before = new Date();
    const mockRequest = new Request('http://localhost:3000/api/summary');
    const response = await GET(mockRequest);
    const data = await response.json();
    const after = new Date();

    const lastUpdated = new Date(data.lastUpdated);
    expect(lastUpdated.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(lastUpdated.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
