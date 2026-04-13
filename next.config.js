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

module.exports = {
  allowedDevOrigins: ['prognathous-awhirl-demarcus.ngrok-free.dev'], // ngrok so that clerk webhooks work in dev
}