/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'utfs.io', 'uploadthing.com', 'k5kuw9ehqm.ufs.sh', 'ufs.sh'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 