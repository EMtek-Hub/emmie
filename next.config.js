/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    EMTEK_HUB_URL: process.env.EMTEK_HUB_URL,
    TOOL_SLUG: process.env.TOOL_SLUG,
  },
  // Optimize for Netlify deployment
  output: 'standalone',
  // Disable image optimization for static deployment if needed
  images: {
    unoptimized: false,
  },
  // Ensure proper trailing slash handling
  trailingSlash: false,
}

module.exports = nextConfig
