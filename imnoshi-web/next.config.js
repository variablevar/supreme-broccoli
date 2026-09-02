/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dev uses the default .next; production builds go to dist so the two never clash.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
