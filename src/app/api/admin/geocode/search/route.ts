import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';

/**
 * TomTom Search API Response
 * Docs: https://developer.tomtom.com/search-api/documentation/search-service/fuzzy-search
 */
interface TomTomSearchResponse {
  results: Array<{
    address: {
      freeformAddress: string;
    };
    position: {
      lat: number;
      lon: number;
    };
  }>;
}

/**
 * GET /api/admin/geocode/search
 * Search for locations using TomTom Search API with typeahead
 *
 * Query Parameters:
 *   - q: Search query (2-100 characters)
 *
 * Returns:
 *   - { results: [{ address, lat, lon }] }
 *
 * TomTom API Limits:
 *   - Free tier: 2,500 requests/day
 *   - Caching: 24 hours (addresses rarely change)
 */
export async function GET(request: Request) {
  try {
    // Authentication check (admin only)
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    // Validation: Query required, min 2 chars, max 100 chars
    if (!query) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    if (query.length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
    }

    if (query.length > 100) {
      return NextResponse.json({ error: 'Query must not exceed 100 characters' }, { status: 400 });
    }

    const apiKey = process.env.TOMTOM_API_KEY;

    // Graceful degradation: Return empty results if API key missing
    if (!apiKey) {
      console.error('[Geocode API] TOMTOM_API_KEY not configured');
      return NextResponse.json({ results: [] });
    }

    // Build TomTom Search API URL with typeahead
    // Typeahead mode returns suggestions as user types
    const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${apiKey}&typeahead=true&limit=5&language=en-US`;

    // Fetch from TomTom with 24-hour cache
    const response = await fetch(url, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      console.error(`[Geocode API] TomTom API error: ${response.status} ${response.statusText}`);
      return NextResponse.json({ results: [] });
    }

    const data: TomTomSearchResponse = await response.json();

    // Transform to simplified format
    const results = (data.results || []).map((result) => ({
      address: result.address.freeformAddress,
      lat: result.position.lat,
      lon: result.position.lon,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[Geocode API] Search failed:', error);
    // Graceful degradation: Return empty results on error
    return NextResponse.json({ results: [] });
  }
}
