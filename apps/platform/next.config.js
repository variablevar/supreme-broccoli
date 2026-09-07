/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dev uses the default .next; production builds go to dist so the two never clash.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // The Next 16 CLI checker loses captured stdout under this Node runtime.
  // Use the supported compiler API; the separate typecheck script still runs tsc.
  experimental: { useTypeScriptCli: false },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
