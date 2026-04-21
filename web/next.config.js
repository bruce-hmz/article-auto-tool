/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow reading from parent directory for core modules
  experimental: {
    serverComponentsExternalPackages: [],
  },
}

module.exports = nextConfig
