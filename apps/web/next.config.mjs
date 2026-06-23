/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@influuc/core", "@influuc/db"],
};

export default nextConfig;
