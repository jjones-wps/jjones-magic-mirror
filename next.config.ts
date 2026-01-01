import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    // Inject build timestamp at build time for version checking
    BUILD_TIME: new Date().toISOString(),
  },
  // Standalone output for Docker deployment
  output: 'standalone',
};

export default nextConfig;
