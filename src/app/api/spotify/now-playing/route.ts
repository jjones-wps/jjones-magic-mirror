/**
 * Spotify Now Playing API Route
 * Returns the currently playing track
 */

import { NextResponse } from 'next/server';

// Spotify API types (subset we use)
interface SpotifyArtist {
  name: string;
}

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_NOW_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';

// ============================================
// GET ACCESS TOKEN
// ============================================
async function getAccessToken(): Promise<string | null> {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!client_id || !client_secret || !refresh_token) {
    return null;
  }

  const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

  try {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
      }),
    });

    if (!response.ok) {
      console.error('Spotify token refresh failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Spotify token error:', error);
    return null;
  }
}

// ============================================
// API HANDLER
// ============================================
export async function GET() {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({
      isPlaying: false,
      configured: false,
      message: 'Spotify not configured',
    });
  }

  try {
    const response = await fetch(SPOTIFY_NOW_PLAYING_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // No content = nothing playing
    if (response.status === 204) {
      return NextResponse.json({
        isPlaying: false,
        configured: true,
      });
    }

    if (!response.ok) {
      return NextResponse.json({
        isPlaying: false,
        configured: true,
        error: 'Failed to fetch',
      });
    }

    const data = await response.json();

    // Handle podcast vs music
    if (data.currently_playing_type === 'episode') {
      return NextResponse.json({
        isPlaying: data.is_playing,
        configured: true,
        type: 'podcast',
        title: data.item?.name || 'Unknown Episode',
        show: data.item?.show?.name || 'Unknown Show',
        imageUrl: data.item?.images?.[0]?.url || data.item?.show?.images?.[0]?.url,
        progress: data.progress_ms,
        duration: data.item?.duration_ms,
      });
    }

    // Music track
    return NextResponse.json({
      isPlaying: data.is_playing,
      configured: true,
      type: 'track',
      title: data.item?.name || 'Unknown Track',
      artist: data.item?.artists?.map((a: SpotifyArtist) => a.name).join(', ') || 'Unknown Artist',
      album: data.item?.album?.name || 'Unknown Album',
      imageUrl: data.item?.album?.images?.[0]?.url,
      progress: data.progress_ms,
      duration: data.item?.duration_ms,
    });
  } catch (error) {
    console.error('Spotify now playing error:', error);
    return NextResponse.json({
      isPlaying: false,
      configured: true,
      error: 'Request failed',
    });
  }
}
