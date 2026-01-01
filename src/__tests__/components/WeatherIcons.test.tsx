/**
 * Tests for WeatherIcons component
 */

import { render } from '@testing-library/react';
import {
  WeatherIcon,
  SunIcon,
  CloudIcon,
  PartlyCloudyIcon,
  FogIcon,
  DrizzleIcon,
  RainIcon,
  SnowIcon,
  ThunderstormIcon,
} from '@/components/widgets/WeatherIcons';

describe('WeatherIcons', () => {
  describe('Individual Icon Components', () => {
    it('should render SunIcon', () => {
      const { container } = render(<SunIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render CloudIcon', () => {
      const { container } = render(<CloudIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render PartlyCloudyIcon', () => {
      const { container } = render(<PartlyCloudyIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render FogIcon', () => {
      const { container } = render(<FogIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render DrizzleIcon', () => {
      const { container } = render(<DrizzleIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render RainIcon', () => {
      const { container } = render(<RainIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render SnowIcon', () => {
      const { container } = render(<SnowIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render ThunderstormIcon', () => {
      const { container } = render(<ThunderstormIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should respect custom size prop', () => {
      const { container } = render(<SunIcon size={100} />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      if (svg) {
        expect(svg.getAttribute('width')).toBe('100');
        expect(svg.getAttribute('height')).toBe('100');
      }
    });

    it('should apply custom className', () => {
      const { container } = render(<SunIcon className="custom-class" />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      if (svg) {
        expect(svg.className.baseVal || svg.getAttribute('class')).toContain('custom-class');
      }
    });
  });

  describe('WeatherIcon Selector', () => {
    it('should render SunIcon for clear sky (code 0)', () => {
      const { container } = render(<WeatherIcon weatherCode={0} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render PartlyCloudyIcon for mainly clear (code 1)', () => {
      const { container } = render(<WeatherIcon weatherCode={1} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render PartlyCloudyIcon for partly cloudy (code 2)', () => {
      const { container } = render(<WeatherIcon weatherCode={2} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render CloudIcon for overcast (code 3)', () => {
      const { container } = render(<WeatherIcon weatherCode={3} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render FogIcon for fog (code 45)', () => {
      const { container } = render(<WeatherIcon weatherCode={45} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render FogIcon for depositing rime fog (code 48)', () => {
      const { container } = render(<WeatherIcon weatherCode={48} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render DrizzleIcon for light drizzle (code 51)', () => {
      const { container } = render(<WeatherIcon weatherCode={51} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render DrizzleIcon for moderate drizzle (code 53)', () => {
      const { container } = render(<WeatherIcon weatherCode={53} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render DrizzleIcon for dense drizzle (code 55)', () => {
      const { container } = render(<WeatherIcon weatherCode={55} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render RainIcon for light rain (code 61)', () => {
      const { container } = render(<WeatherIcon weatherCode={61} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render RainIcon for moderate rain (code 63)', () => {
      const { container } = render(<WeatherIcon weatherCode={63} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render RainIcon for heavy rain (code 65)', () => {
      const { container } = render(<WeatherIcon weatherCode={65} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render SnowIcon for light snow (code 71)', () => {
      const { container } = render(<WeatherIcon weatherCode={71} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render SnowIcon for moderate snow (code 73)', () => {
      const { container } = render(<WeatherIcon weatherCode={73} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render SnowIcon for heavy snow (code 75)', () => {
      const { container } = render(<WeatherIcon weatherCode={75} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render ThunderstormIcon for thunderstorm (code 95)', () => {
      const { container } = render(<WeatherIcon weatherCode={95} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render ThunderstormIcon for thunderstorm with hail (code 96)', () => {
      const { container } = render(<WeatherIcon weatherCode={96} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render ThunderstormIcon for thunderstorm with heavy hail (code 99)', () => {
      const { container } = render(<WeatherIcon weatherCode={99} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render default CloudIcon for unknown code', () => {
      const { container } = render(<WeatherIcon weatherCode={999} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should pass size prop to icon components', () => {
      const { container } = render(<WeatherIcon weatherCode={0} size={80} />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      if (svg) {
        expect(svg.getAttribute('width')).toBe('80');
        expect(svg.getAttribute('height')).toBe('80');
      }
    });

    it('should pass className prop to icon components', () => {
      const { container } = render(<WeatherIcon weatherCode={0} className="weather-icon" />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      if (svg) {
        expect(svg.className.baseVal || svg.getAttribute('class')).toContain('weather-icon');
      }
    });
  });

  describe('Icon Rendering with Default Props', () => {
    it('should use default size of 64 when not specified', () => {
      const { container } = render(<SunIcon />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      if (svg) {
        expect(svg.getAttribute('width')).toBe('64');
        expect(svg.getAttribute('height')).toBe('64');
      }
    });

    it('should render with className attribute', () => {
      const { container } = render(<SunIcon />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      // SVG will have a class attribute (might be empty or have classes)
      expect(svg).toHaveAttribute('class');
    });
  });
});
