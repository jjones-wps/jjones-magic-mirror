# Moon Phase Images & Implementation Guide

This document provides resources and implementation guidance for the Moon Phase widget.

## Current Status

**FEATURE STUB**: The widget UI skeleton exists but displays mock data. Full implementation requires:

1. Moon phase calculation algorithm
2. High-resolution moon phase images
3. API route for moon data
4. Moonrise/moonset time calculations

## Ultra High-Resolution Moon Phase Images

### NASA Scientific Visualization Studio

**Best option for production use**

- **URL**: https://svs.gsfc.nasa.gov/cgi-bin/details.cgi?aid=4874
- **Resolution**: 8192 x 4096 px (CGI Moon Kit)
- **Quality**: Photorealistic, based on Lunar Reconnaissance Orbiter data
- **License**: Public domain (NASA)
- **Formats**: TIFF, PNG
- **Coverage**: All moon phases at 1-hour intervals

**Download Instructions:**

1. Visit the NASA SVS page
2. Download the "CGI Moon Kit" (high-resolution images)
3. Images show moon at various phase angles (0° to 360°)
4. File naming: `moon_XXXX.png` where XXXX = phase angle

**File Size Warning**: Full kit is ~2GB. For magic mirror use, consider:

- Downsample to 512x512 or 1024x1024 for display
- Select only the 8 major phases (New, Waxing Crescent, First Quarter, etc.)
- Use WebP format for ~30% file size reduction

### Alternative: USNO Moon Phase Images

- **URL**: https://aa.usno.navy.mil/imagery/moon
- **Resolution**: Lower resolution but accurate
- **Updates**: Generated daily for current phase
- **License**: Public domain (U.S. Government)

### Alternative: Wikimedia Commons

- **URL**: https://commons.wikimedia.org/wiki/Category:Phases_of_the_Moon
- **Resolution**: Varies (typically 512x512 to 2048x2048)
- **Quality**: Mix of photographs and CGI
- **License**: Varies (check individual images)

## Moon Phase Calculation Algorithm

### Option 1: Astronomical Algorithms

Based on Jean Meeus's "Astronomical Algorithms" (Chapter 49).

```typescript
/**
 * Calculate moon phase from 0 (new moon) to 1 (next new moon)
 * Based on simplified algorithm from Meeus
 */
function getMoonPhase(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let c, e, jd, b;

  if (month < 3) {
    year--;
    month += 12;
  }

  ++month;

  c = 365.25 * year;
  e = 30.6 * month;
  jd = c + e + day - 694039.09; // Julian date relative to 1985
  jd /= 29.53; // Moon phase period

  return jd - Math.floor(jd); // Normalize to 0-1
}

/**
 * Get moon phase name from phase value
 */
function getPhaseName(phase: number): string {
  if (phase < 0.033) return 'New Moon';
  if (phase < 0.216) return 'Waxing Crescent';
  if (phase < 0.283) return 'First Quarter';
  if (phase < 0.466) return 'Waxing Gibbous';
  if (phase < 0.533) return 'Full Moon';
  if (phase < 0.716) return 'Waning Gibbous';
  if (phase < 0.783) return 'Last Quarter';
  if (phase < 0.966) return 'Waning Crescent';
  return 'New Moon';
}

/**
 * Get illumination percentage
 */
function getIllumination(phase: number): number {
  // Cosine approximation for moon illumination
  return Math.round((1 - Math.cos(phase * 2 * Math.PI)) * 50);
}
```

**Accuracy**: ±1 day over several centuries (sufficient for display purposes)

**References**:

- Meeus, Jean. _Astronomical Algorithms_. 2nd ed. Willmann-Bell, 1998.
- Online calculator: https://www.subsystems.us/uploads/9/8/9/4/98948044/moonphase.pdf

### Option 2: USNO API (Recommended)

**Pros**: Most accurate, no calculation needed
**Cons**: Requires API calls, rate limits apply

```typescript
/**
 * Fetch moon phase data from USNO API
 */
async function fetchMoonPhaseFromUSNO(date: Date, lat: number, lon: number) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const url = `https://aa.usno.navy.mil/api/rstt/oneday`;
  const params = new URLSearchParams({
    date: `${month}/${day}/${year}`,
    coords: `${lat},${lon}`,
    tz: '-5', // EST - adjust based on mirror location
  });

  const response = await fetch(`${url}?${params}`);
  const data = await response.json();

  return {
    moonrise: data.properties.data.moondata[0].time,
    moonset: data.properties.data.moondata[1].time,
    // API also provides sun data, moon fraction illuminated
  };
}
```

**API Limits**: 100 requests per day per IP (sufficient for once-daily refresh)

**Documentation**: https://aa.usno.navy.mil/data/api

### Option 3: npm Package `suncalc`

**Best for rapid implementation**

```bash
npm install suncalc
```

```typescript
import SunCalc from 'suncalc';

function getMoonInfo(date: Date, lat: number, lon: number) {
  const moonIllumination = SunCalc.getMoonIllumination(date);
  const moonTimes = SunCalc.getMoonTimes(date, lat, lon);

  return {
    phase: moonIllumination.phase, // 0-1
    illumination: Math.round(moonIllumination.fraction * 100),
    phaseName: getPhaseName(moonIllumination.phase),
    moonrise: moonTimes.rise,
    moonset: moonTimes.set,
  };
}
```

**Accuracy**: Uses simplified algorithms (±30 minutes for rise/set times)
**License**: MIT
**Package**: https://www.npmjs.com/package/suncalc

## Recommended Implementation Plan

### Phase 1: Basic Display (1-2 hours)

1. Install `suncalc` package
2. Create `/api/moon-phase` route using suncalc
3. Display phase name, illumination, rise/set times
4. Use emoji moon phases (🌑🌒🌓🌔🌕🌖🌗🌘) as placeholder

### Phase 2: Image Integration (2-3 hours)

1. Download 8 major moon phase images from NASA SVS
2. Downscale to 512x512 or 1024x1024 (depending on mirror resolution)
3. Convert to WebP for smaller file size
4. Store in `/public/moon-phases/` directory
5. Map phase angle to correct image

### Phase 3: Advanced Features (2-4 hours)

1. Calculate next full moon / new moon dates
2. Add moon age (days since new moon)
3. Add zodiac sign (optional)
4. Add supermoon indicator (when perigee < 360,000 km)
5. Add lunar eclipse dates (requires ephemeris data)

## File Structure

```
public/
  moon-phases/
    new.webp           # Phase angle 0°
    waxing-crescent.webp  # Phase angle 45°
    first-quarter.webp    # Phase angle 90°
    waxing-gibbous.webp   # Phase angle 135°
    full.webp          # Phase angle 180°
    waning-gibbous.webp   # Phase angle 225°
    last-quarter.webp     # Phase angle 270°
    waning-crescent.webp  # Phase angle 315°

src/
  app/
    api/
      moon-phase/
        route.ts       # GET /api/moon-phase
  components/
    widgets/
      MoonPhase.tsx    # Widget component (already exists as stub)
  lib/
    moon.ts           # Moon calculation utilities
```

## API Route Implementation

```typescript
// src/app/api/moon-phase/route.ts

import { NextResponse } from 'next/server';
import SunCalc from 'suncalc';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Get location from weather settings
    const settings = await prisma.setting.findMany({
      where: { category: 'weather' },
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.id.replace('weather.', '')] = s.value;
    });

    const lat = parseFloat(settingsMap.latitude || '41.0793');
    const lon = parseFloat(settingsMap.longitude || '-85.1394');
    const now = new Date();

    const moonIllumination = SunCalc.getMoonIllumination(now);
    const moonTimes = SunCalc.getMoonTimes(now, lat, lon);

    // Calculate next full moon (simplified)
    const nextFullMoon = new Date(now);
    nextFullMoon.setDate(now.getDate() + Math.ceil((0.5 - moonIllumination.phase) * 29.53));

    // Calculate next new moon (simplified)
    const nextNewMoon = new Date(now);
    nextNewMoon.setDate(now.getDate() + Math.ceil((1 - moonIllumination.phase) * 29.53));

    return NextResponse.json({
      phase: moonIllumination.phase,
      phaseName: getPhaseName(moonIllumination.phase),
      illumination: Math.round(moonIllumination.fraction * 100),
      age: moonIllumination.phase * 29.53,
      nextFullMoon: nextFullMoon.toISOString(),
      nextNewMoon: nextNewMoon.toISOString(),
      moonrise: moonTimes.rise?.toISOString(),
      moonset: moonTimes.set?.toISOString(),
      lastUpdated: now.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching moon phase:', error);
    return NextResponse.json({ error: 'Failed to fetch moon phase' }, { status: 500 });
  }
}

function getPhaseName(phase: number): string {
  if (phase < 0.033) return 'New Moon';
  if (phase < 0.216) return 'Waxing Crescent';
  if (phase < 0.283) return 'First Quarter';
  if (phase < 0.466) return 'Waxing Gibbous';
  if (phase < 0.533) return 'Full Moon';
  if (phase < 0.716) return 'Waning Gibbous';
  if (phase < 0.783) return 'Last Quarter';
  if (phase < 0.966) return 'Waning Crescent';
  return 'New Moon';
}
```

## Performance Considerations

### Caching Strategy

- **API Route**: Cache for 1 hour (`revalidate: 3600`)
- **Widget Refresh**: Poll every hour (moon phase changes slowly)
- **Image Loading**: Preload all 8 phase images on mount

### File Size Optimization

- **Original NASA images**: ~250KB each (PNG, 8192x4096)
- **Downscaled to 512x512**: ~50KB each (PNG)
- **Converted to WebP**: ~15KB each
- **Total for 8 images**: ~120KB (acceptable for magic mirror)

### Alternative: Single Sprite Sheet

Create a single image with all 8 phases in a row:

- **Size**: 4096 x 512 px (8 images at 512x512)
- **Format**: WebP
- **File size**: ~80KB (single file)
- **CSS**: Use `background-position` to show correct phase

## Testing Checklist

- [ ] Widget displays current moon phase name
- [ ] Illumination percentage matches external source (timeanddate.com/moon/phases)
- [ ] Moonrise/moonset times within ±30 minutes of USNO data
- [ ] Images display correctly for all 8 major phases
- [ ] Next full/new moon dates are accurate (±1 day)
- [ ] Widget refreshes hourly without flash
- [ ] Placeholder emoji shown during image load
- [ ] Error state displays if API fails

## Resources

- **NASA SVS**: https://svs.gsfc.nasa.gov/cgi-bin/details.cgi?aid=4874
- **USNO API**: https://aa.usno.navy.mil/data/api
- **suncalc npm**: https://www.npmjs.com/package/suncalc
- **Meeus Algorithm**: https://www.subsystems.us/uploads/9/8/9/4/98948044/moonphase.pdf
- **Time and Date (verification)**: https://www.timeanddate.com/moon/phases/

## License Notes

- **NASA images**: Public domain (no attribution required)
- **USNO data**: Public domain (U.S. Government)
- **suncalc library**: MIT License

## Estimated Implementation Time

- **Basic (suncalc + emoji)**: 1-2 hours
- **With NASA images**: 3-5 hours
- **Full featured**: 6-8 hours
