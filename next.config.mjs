/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://13.216.114.20:8001"
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ]
  },
}

export default nextConfig
