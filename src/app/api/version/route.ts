/**
 * Version API Route
 * Returns the build timestamp for version-aware auto-refresh
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    buildTime: process.env.BUILD_TIME || 'development',
    timestamp: Date.now(),
  });
}
