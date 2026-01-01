/**
 * Tests for weather utility functions
 */

import {
  getWeatherDescription,
  getWeatherShort,
  isGoodWeather,
  hasPrecipitation,
} from '@/lib/weather';

describe('Weather Utilities', () => {
  describe('getWeatherDescription', () => {
    it('should return correct description for clear sky', () => {
      expect(getWeatherDescription(0)).toBe('Clear sky');
      expect(getWeatherDescription(1)).toBe('Mainly clear');
    });

    it('should return correct description for cloudy conditions', () => {
      expect(getWeatherDescription(2)).toBe('Partly cloudy');
      expect(getWeatherDescription(3)).toBe('Overcast');
    });

    it('should return correct description for rain', () => {
      expect(getWeatherDescription(61)).toBe('Slight rain');
      expect(getWeatherDescription(63)).toBe('Moderate rain');
      expect(getWeatherDescription(65)).toBe('Heavy rain');
    });

    it('should return "Unknown" for unknown code', () => {
      expect(getWeatherDescription(999)).toBe('Unknown');
    });
  });

  describe('getWeatherShort', () => {
    it('should return short description for clear sky', () => {
      expect(getWeatherShort(0)).toBe('Clear');
      expect(getWeatherShort(1)).toBe('Clear');
    });

    it('should return short description for rain', () => {
      expect(getWeatherShort(61)).toBe('Rain');
      expect(getWeatherShort(65)).toBe('Heavy Rain');
    });

    it('should return "Unknown" for unknown code', () => {
      expect(getWeatherShort(999)).toBe('Unknown');
    });
  });

  describe('isGoodWeather', () => {
    it('should return true for clear and cloudy weather', () => {
      expect(isGoodWeather(0)).toBe(true);
      expect(isGoodWeather(1)).toBe(true);
      expect(isGoodWeather(2)).toBe(true);
      expect(isGoodWeather(3)).toBe(true);
    });

    it('should return false for precipitation weather', () => {
      expect(isGoodWeather(61)).toBe(false);
      expect(isGoodWeather(95)).toBe(false);
    });
  });

  describe('hasPrecipitation', () => {
    it('should return false for clear weather', () => {
      expect(hasPrecipitation(0)).toBe(false);
      expect(hasPrecipitation(3)).toBe(false);
    });

    it('should return true for drizzle and rain', () => {
      expect(hasPrecipitation(51)).toBe(true);
      expect(hasPrecipitation(61)).toBe(true);
      expect(hasPrecipitation(95)).toBe(true);
    });
  });
});
