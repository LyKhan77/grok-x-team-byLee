/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/v1/:path*',
        destination: '/api/v1/:path*',
      },
      {
        source: '/health',
        destination: '/api/health',
      },
    ];
  },
};
module.exports = nextConfig;
