import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Render runs `node .next/standalone/server.js`; standalone bundles the
  // server and its dependencies so the free-tier image stays small.
  output: 'standalone',
  reactStrictMode: true,
  // The runtime prompts are read from disk at request time, by a path built at
  // runtime, so Next's static tracing cannot see them and would ship a bundle
  // that 500s on the first forecast. ADR-0018 makes these files deliverables
  // rather than string literals, which is the whole point, so they have to be
  // traced explicitly.
  outputFileTracingIncludes: {
    '/api/ai/**': ['./prompts/runtime/**'],
  },
};

export default nextConfig;
