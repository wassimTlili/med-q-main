/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'utfs.io', 'uploadthing.com'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 