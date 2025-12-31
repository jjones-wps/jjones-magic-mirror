/**
 * Commute API Route
 * Fetches traffic-aware commute data from TomTom Routing API
 */

import { NextResponse } from "next/server";
import {
  buildTomTomUrl,
  parseTomTomResponse,
  getDemoCommuteData,
  type TomTomRouteResponse,
  type CommuteAPIResponse,
} from "@/lib/commute";

// ============================================
// CONFIGURATION
// ============================================

interface CommuteConfig {
  name: string;
  origin: string | undefined;
  destination: string | undefined;
  targetArrivalTime: string;
}

function getCommuteConfigs(): CommuteConfig[] {
  return [
    {
      name: process.env.COMMUTE_1_NAME || "Commute 1",
      origin: process.env.COMMUTE_1_ORIGIN,
      destination: process.env.COMMUTE_1_DESTINATION,
      targetArrivalTime: process.env.COMMUTE_1_ARRIVAL_TIME || "08:30",
    },
    {
      name: process.env.COMMUTE_2_NAME || "Commute 2",
      origin: process.env.COMMUTE_2_ORIGIN,
      destination: process.env.COMMUTE_2_DESTINATION,
      targetArrivalTime: process.env.COMMUTE_2_ARRIVAL_TIME || "08:00",
    },
  ];
}

// ============================================
// TOMTOM API FETCHER
// ============================================

async function fetchCommuteFromTomTom(
  config: CommuteConfig,
  apiKey: string
): Promise<{
  name: string;
  durationMinutes: number;
  distanceMiles: number;
  trafficDelayMinutes: number;
  trafficStatus: "light" | "moderate" | "heavy";
  suggestedDepartureTime: string;
  targetArrivalTime: string;
} | null> {
  if (!config.origin || !config.destination) {
    return null;
  }

  try {
    const url = buildTomTomUrl(config.origin, config.destination, apiKey);

    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(
        `TomTom API error for ${config.name}:`,
        response.status,
        await response.text()
      );
      return null;
    }

    const data: TomTomRouteResponse = await response.json();
    const parsed = parseTomTomResponse(
      data,
      config.name,
      config.targetArrivalTime
    );

    if (!parsed) {
      return null;
    }

    return {
      name: parsed.name,
      durationMinutes: Math.round(parsed.durationMinutes),
      distanceMiles: Math.round(parsed.distanceMiles * 10) / 10,
      trafficDelayMinutes: Math.round(parsed.trafficDelayMinutes),
      trafficStatus: parsed.trafficStatus,
      suggestedDepartureTime: parsed.suggestedDepartureTime.toISOString(),
      targetArrivalTime: parsed.targetArrivalTime,
    };
  } catch (error) {
    console.error(`Failed to fetch commute for ${config.name}:`, error);
    return null;
  }
}

// ============================================
// API HANDLER
// ============================================

export async function GET() {
  const apiKey = process.env.TOMTOM_API_KEY;

  // If no API key, return demo data
  if (!apiKey) {
    console.log("No TOMTOM_API_KEY configured, returning demo data");
    return NextResponse.json(getDemoCommuteData());
  }

  const configs = getCommuteConfigs();

  // Filter out unconfigured commutes
  const validConfigs = configs.filter(
    (config) => config.origin && config.destination
  );

  if (validConfigs.length === 0) {
    console.log("No commutes configured, returning demo data");
    return NextResponse.json(getDemoCommuteData());
  }

  // Fetch all commutes in parallel
  const results = await Promise.all(
    validConfigs.map((config) => fetchCommuteFromTomTom(config, apiKey))
  );

  // Filter out failed requests
  const commutes = results.filter(
    (result): result is NonNullable<typeof result> => result !== null
  );

  // If all requests failed, return demo data
  if (commutes.length === 0) {
    console.warn("All TomTom requests failed, returning demo data");
    return NextResponse.json(getDemoCommuteData());
  }

  const response: CommuteAPIResponse = {
    commutes,
    lastUpdated: new Date().toISOString(),
    isDemo: false,
  };

  return NextResponse.json(response);
}
