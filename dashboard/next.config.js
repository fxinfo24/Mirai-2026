/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizePackageImports: ['three', 'framer-motion', '@heroicons/react'],
  },
  webpack: (config) => {
    // Optimize Three.js bundle
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        three: {
          test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
          name: 'three',
          priority: 20,
          reuseExistingChunk: true,
        },
        // react-window + virtualization — only loaded on bots page
        virtualization: {
          test: /[\\/]node_modules[\\/](react-window|react-virtualized-auto-sizer)[\\/]/,
          name: 'virtualization',
          priority: 15,
          reuseExistingChunk: true,
        },
        // Recharts / D3 — only loaded on analytics page
        charts: {
          test: /[\\/]node_modules[\\/](recharts|d3-)[\\/]/,
          name: 'charts',
          priority: 12,
          reuseExistingChunk: true,
        },
        // General vendor chunk
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ws: wss:;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
