/** @type {import('next').NextConfig} */
// A hosting platform may inject just the API hostname (e.g. Render's
// fromService `host` property), so default the scheme to https when absent.
const RAW_API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const API_BASE = /^https?:\/\//.test(RAW_API_BASE) ? RAW_API_BASE : `https://${RAW_API_BASE}`;

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
