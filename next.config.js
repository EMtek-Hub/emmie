/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    EMTEK_HUB_URL: process.env.EMTEK_HUB_URL,
    TOOL_SLUG: process.env.TOOL_SLUG,
  },
}

module.exports = nextConfig
