/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@influuc/core", "@influuc/db"],
  experimental: {
    nodeMiddleware: true,
  },
};

export default nextConfig;
