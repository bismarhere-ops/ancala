/** @type {import('next').NextConfig} */
// A hosting platform may inject just the API hostname (e.g. Render's
// fromService `host` property), so default the scheme to https when absent.
// On Netlify the API is a function on the same site; netlify.toml routes
// /api/* there before these rewrites apply.
const RAW_API_BASE =
  process.env.API_BASE_URL ||
  (process.env.NETLIFY && process.env.URL) ||
  'http://localhost:3000';
const API_BASE = /^https?:\/\//.test(RAW_API_BASE) ? RAW_API_BASE : `https://${RAW_API_BASE}`;

const nextConfig = {
  // Netlify sets NETLIFY and URL during the build but not necessarily in the
  // runtime function that regenerates pages. Bake the site URL in so server
  // components can still reach the API after deploy.
  env: process.env.NETLIFY && process.env.URL ? { NETLIFY_SITE_URL: process.env.URL } : {},
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  async rewrites() {
    // On Netlify, netlify.toml routes /api/* and /uploads/* to the API
    // function. A rewrite here would point back at the site itself and could
    // loop if Next's handler ever answered first, so add none.
    if (process.env.NETLIFY) return [];
    // Proxy /api/* and /uploads/* to the Express backend during dev and prod.
    return [
      { source: '/api/:path*', destination: `${API_BASE}/api/:path*` },
      { source: '/uploads/:path*', destination: `${API_BASE}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
