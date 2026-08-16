import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Render runs `node .next/standalone/server.js`; standalone bundles the
  // server and its dependencies so the free-tier image stays small.
  output: 'standalone',
  reactStrictMode: true,
};

export default nextConfig;
