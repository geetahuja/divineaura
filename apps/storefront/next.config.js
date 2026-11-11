const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

// Product and Sacred Places images are uploaded to the Medusa backend and served
// from its host (dev: localhost:9000/static, prod: api.divineaura.com/uploads).
const backend = new URL(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000")

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  // Return requests (3 photos) and reviews (4 photos) carry photos resized in the browser.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  // Milestone 12: policies moved under /policies (content pages edited in admin).
  async redirects() {
    const moved = { shipping: "shipping", returns: "returns-refunds", privacy: "privacy", terms: "terms" }
    return Object.entries(moved).flatMap(([from, to]) => [
      { source: `/${from}`, destination: `/policies/${to}`, permanent: true },
      { source: `/:countryCode(in)/${from}`, destination: `/policies/${to}`, permanent: true },
    ])
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Link", value: '</.well-known/ucp>; rel="ucp"' }],
      },
      {
        source: "/:countryCode/products/:handle",
        headers: [{ key: "Vary", value: "Accept" }],
      },
    ]
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/:countryCode/products/:handle([^/.]+).md",
          destination: "/:countryCode/products/:handle/markdown",
        },
        {
          source: "/:countryCode/products/:handle([^/.]+)",
          has: [{ type: "header", key: "accept", value: ".*text/markdown.*" }],
          destination: "/:countryCode/products/:handle/markdown",
        },
      ],
    }
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: backend.protocol.replace(":", ""),
        hostname: backend.hostname,
        port: backend.port,
      },
    ],
  },
}

module.exports = nextConfig
