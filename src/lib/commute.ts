/**
 * Commute Service
 * TomTom Routing API integration for traffic-aware commute information
 */

// ============================================
// TYPES
// ============================================

export type TrafficStatus = 'light' | 'moderate' | 'heavy';

export interface CommuteConfig {
  name: string;
  origin: string;
  destination: string;
  targetArrivalTime: string; // "HH:mm" format
}

export interface CommuteData {
  name: string;
  durationMinutes: number;
  distanceMiles: number;
  trafficDelayMinutes: number;
  trafficStatus: TrafficStatus;
  suggestedDepartureTime: Date;
  targetArrivalTime: string;
}

export interface CommuteAPIResponse {
  commutes: Array<{
    name: string;
    durationMinutes: number;
    distanceMiles: number;
    trafficDelayMinutes: number;
    trafficStatus: TrafficStatus;
    suggestedDepartureTime: string;
    targetArrivalTime: string;
  }>;
  lastUpdated: string;
  isDemo: boolean;
}

// TomTom API response types
export interface TomTomRouteSummary {
  lengthInMeters: number;
  travelTimeInSeconds: number;
  trafficDelayInSeconds: number;
  departureTime: string;
  arrivalTime: string;
}

export interface TomTomRouteResponse {
  routes: Array<{
    summary: TomTomRouteSummary;
  }>;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Determine traffic status based on delay percentage
 */
export function getTrafficStatus(delayMinutes: number, totalMinutes: number): TrafficStatus {
  if (totalMinutes <= 0) return 'light';

  const delayPercentage = (delayMinutes / totalMinutes) * 100;

  if (delayPercentage < 10) return 'light';
  if (delayPercentage < 25) return 'moderate';
  return 'heavy';
}

/**
 * Calculate suggested departure time based on target arrival and duration
 */
export function calculateDepartureTime(targetArrivalTime: string, durationMinutes: number): Date {
  const now = new Date();
  const [hours, minutes] = targetArrivalTime.split(':').map(Number);

  // Create target arrival date for today
  const targetArrival = new Date(now);
  targetArrival.setHours(hours, minutes, 0, 0);

  // Subtract duration to get departure time
  const departureTime = new Date(targetArrival.getTime() - durationMinutes * 60 * 1000);

  return departureTime;
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

/**
 * Format distance for display
 */
export function formatDistance(miles: number): string {
  return `${miles.toFixed(1)} mi`;
}

/**
 * Convert meters to miles
 */
export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

/**
 * Check if current time is during workday morning hours
 * Mon-Fri, 6 AM - 9 AM in local timezone
 * Set COMMUTE_ALWAYS_SHOW=true in env to bypass for dev/debugging
 */
export function isWorkdayMorning(alwaysShow: boolean = false): boolean {
  // Dev mode override
  if (alwaysShow) {
    return true;
  }

  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  // Check if weekday (1 = Monday, 5 = Friday)
  const isWeekday = day >= 1 && day <= 5;

  // Check if morning hours (6 AM - 9 AM)
  const isMorning = hour >= 6 && hour < 9;

  return isWeekday && isMorning;
}

/**
 * Get traffic status label for display
 */
export function getTrafficLabel(status: TrafficStatus): string {
  const labels: Record<TrafficStatus, string> = {
    light: 'Light traffic',
    moderate: 'Moderate traffic',
    heavy: 'Heavy traffic',
  };
  return labels[status];
}

// ============================================
// DEMO DATA
// ============================================

/**
 * Generate demo commute data for development/fallback
 */
export function getDemoCommuteData(): CommuteAPIResponse {
  const now = new Date();

  return {
    commutes: [
      {
        name: 'Jack',
        durationMinutes: 24,
        distanceMiles: 12.3,
        trafficDelayMinutes: 3,
        trafficStatus: 'light',
        suggestedDepartureTime: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          8,
          6,
          0
        ).toISOString(),
        targetArrivalTime: '08:30',
      },
      {
        name: 'Lauren',
        durationMinutes: 18,
        distanceMiles: 8.7,
        trafficDelayMinutes: 5,
        trafficStatus: 'moderate',
        suggestedDepartureTime: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          7,
          42,
          0
        ).toISOString(),
        targetArrivalTime: '08:00',
      },
    ],
    lastUpdated: now.toISOString(),
    isDemo: true,
  };
}

// ============================================
// API HELPERS
// ============================================

/**
 * Build TomTom API URL for route calculation
 */
export function buildTomTomUrl(origin: string, destination: string, apiKey: string): string {
  // Encode locations for URL
  const encodedOrigin = encodeURIComponent(origin);
  const encodedDest = encodeURIComponent(destination);

  const baseUrl = 'https://api.tomtom.com/routing/1/calculateRoute';
  const params = new URLSearchParams({
    key: apiKey,
    traffic: 'true',
    travelMode: 'car',
    routeType: 'fastest',
  });

  return `${baseUrl}/${encodedOrigin}:${encodedDest}/json?${params}`;
}

/**
 * Parse TomTom API response into CommuteData
 */
export function parseTomTomResponse(
  response: TomTomRouteResponse,
  name: string,
  targetArrivalTime: string
): CommuteData | null {
  if (!response.routes || response.routes.length === 0) {
    return null;
  }

  const summary = response.routes[0].summary;

  const durationMinutes = summary.travelTimeInSeconds / 60;
  const distanceMiles = metersToMiles(summary.lengthInMeters);
  const trafficDelayMinutes = summary.trafficDelayInSeconds / 60;
  const trafficStatus = getTrafficStatus(trafficDelayMinutes, durationMinutes);
  const suggestedDepartureTime = calculateDepartureTime(targetArrivalTime, durationMinutes);

  return {
    name,
    durationMinutes,
    distanceMiles,
    trafficDelayMinutes,
    trafficStatus,
    suggestedDepartureTime,
    targetArrivalTime,
  };
}
