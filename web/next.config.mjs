/** @type {import('next').NextConfig} */
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  async rewrites() {
    // Proxy /api/* and /uploads/* to the Express backend during dev and prod.
    return [
      { source: '/api/:path*', destination: `${API_BASE}/api/:path*` },
      { source: '/uploads/:path*', destination: `${API_BASE}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
