/**
 * Spotify OAuth Callback Route
 * Exchanges authorization code for tokens
 */

import { NextRequest, NextResponse } from 'next/server';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri =
  process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/api/spotify/callback';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  if (!client_id || !client_secret) {
    return NextResponse.json({ error: 'Spotify credentials not configured' }, { status: 500 });
  }

  try {
    const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: 'Token exchange failed', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return the refresh token - user should add this to .env.local
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Spotify Connected</title>
          <style>
            body {
              font-family: system-ui, sans-serif;
              background: #000;
              color: #fff;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 { color: #1DB954; }
            code {
              background: #222;
              padding: 4px 8px;
              border-radius: 4px;
              display: block;
              margin: 10px 0;
              word-break: break-all;
            }
            .token {
              background: #1a1a1a;
              border: 1px solid #333;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <h1>✓ Spotify Connected!</h1>
          <p>Add this refresh token to your <code>.env.local</code> file:</p>
          <div class="token">
            <code>SPOTIFY_REFRESH_TOKEN=${data.refresh_token}</code>
          </div>
          <p>Then restart the dev server.</p>
          <p style="opacity: 0.5; font-size: 14px;">
            Access Token (expires in 1 hour): ${data.access_token?.substring(0, 20)}...
          </p>
        </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (error) {
    console.error('Spotify callback error:', error);
    return NextResponse.json({ error: 'Token exchange failed' }, { status: 500 });
  }
}
