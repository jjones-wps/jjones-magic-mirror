/**
 * Spotify Authorization Route
 * Redirects to Spotify for OAuth authorization
 */

import { NextResponse } from 'next/server';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';

const client_id = process.env.SPOTIFY_CLIENT_ID;
const redirect_uri =
  process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/api/spotify/callback';

// Scopes needed for now playing
const scopes = ['user-read-currently-playing', 'user-read-playback-state'].join(' ');

export async function GET() {
  if (!client_id) {
    return NextResponse.json({ error: 'SPOTIFY_CLIENT_ID not configured' }, { status: 500 });
  }

  const params = new URLSearchParams({
    client_id,
    response_type: 'code',
    redirect_uri,
    scope: scopes,
  });

  return NextResponse.redirect(`${SPOTIFY_AUTH_URL}?${params.toString()}`);
}
