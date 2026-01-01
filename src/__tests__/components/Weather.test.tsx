/**
 * Tests for Weather widget component
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import Weather from '@/components/widgets/Weather';
import type { WeatherData } from '@/lib/weather';

// Mock the weather library
jest.mock('@/lib/weather', () => ({
  fetchWeather: jest.fn(),
  getWeatherShort: jest.fn((code: number) => {
    if (code === 2) return 'Cloudy';
    return 'Clear';
  }),
}));

// Mock the WeatherIcons component
jest.mock('@/components/widgets/WeatherIcons', () => ({
  WeatherIcon: () => <div data-testid="weather-icon">Icon</div>,
}));

// Import mocked function
import { fetchWeather } from '@/lib/weather';

// Use current date for mock data to ensure "Today" is displayed correctly
const today = new Date();
today.setHours(0, 0, 0, 0);

const mockWeatherData: WeatherData = {
  current: {
    temperature: 72,
    feelsLike: 70,
    humidity: 60,
    windSpeed: 10,
    weatherCode: 2,
    isDay: true,
  },
  hourly: [
    {
      time: new Date(),
      temperature: 72,
      weatherCode: 2,
      precipitationProbability: 0,
    },
    {
      time: new Date(),
      temperature: 74,
      weatherCode: 1,
      precipitationProbability: 0,
    },
  ],
  daily: [
    {
      date: today,
      tempHigh: 75,
      tempLow: 50,
      weatherCode: 2,
      precipitationProbability: 10,
      sunrise: new Date(),
      sunset: new Date(),
    },
  ],
  location: 'Fort Wayne, IN',
  lastUpdated: new Date(),
};

describe('Weather Widget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render loading state initially', () => {
    (fetchWeather as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<Weather />);

    expect(screen.getByText('Weather')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should fetch and display weather data', async () => {
    (fetchWeather as jest.Mock).mockResolvedValue(mockWeatherData);

    render(<Weather />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should show temperature
    await waitFor(() => {
      expect(screen.getByText('72')).toBeInTheDocument();
    });

    // Should show condition
    expect(screen.getByText('Cloudy')).toBeInTheDocument();

    // Should show location
    expect(screen.getByText('Fort Wayne, IN')).toBeInTheDocument();
  });

  it('should display feels like temperature', async () => {
    (fetchWeather as jest.Mock).mockResolvedValue(mockWeatherData);

    render(<Weather />);

    await waitFor(() => {
      expect(screen.getByText(/Feels/)).toBeInTheDocument();
    });

    expect(screen.getByText(/70/)).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    (fetchWeather as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<Weather />);

    await waitFor(() => {
      expect(screen.getByText('Unable to load weather')).toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  it('should refresh weather data periodically', async () => {
    (fetchWeather as jest.Mock).mockResolvedValue(mockWeatherData);

    render(<Weather />);

    // Initial fetch
    await waitFor(() => {
      expect(fetchWeather).toHaveBeenCalledTimes(1);
    });

    // Advance 15 minutes (refresh interval)
    await act(async () => {
      jest.advanceTimersByTime(15 * 60 * 1000);
    });

    // Should have fetched again
    expect(fetchWeather).toHaveBeenCalledTimes(2);
  });

  it('should display weather forecast for current day', async () => {
    (fetchWeather as jest.Mock).mockResolvedValue(mockWeatherData);

    render(<Weather />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should show "Today" for current day
    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    // Should show high/low temps
    expect(screen.getByText('75°')).toBeInTheDocument();
    expect(screen.getByText('50°')).toBeInTheDocument();
  });
});
