/** @type {import('next').NextConfig} */
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {},
  // Clean, friendly vanity URLs for outreach. Each serves the homepage unchanged
  // (the URL in the bar stays e.g. /pubs, so there are no utm_ tags screaming
  // "mass campaign"), while Vercel Web Analytics still attributes the visit by path.
  // These must also be whitelisted in middleware.js isPublicRoute, or Clerk gates them.
  async rewrites() {
    return [
      { source: '/hello', destination: '/' },
      { source: '/pubs', destination: '/' },
      { source: '/cafes', destination: '/' },
      { source: '/shops', destination: '/' },
      { source: '/care', destination: '/' },
      { source: '/christmas', destination: '/' },
      { source: '/christmas-gift', destination: '/' },
    ]
  },
  webpack: (config, { isServer }) => {
    if (!config.ignoreWarnings) {
      config.ignoreWarnings = [];
    }
    // Ignore Python files
    config.module.rules.push({
      test: /\.py$/,
      type: 'asset/resource',
      generator: {
        emit: false,
      },
    });
    return config;
  },
}

module.exports = withBundleAnalyzer(withPWA(nextConfig))