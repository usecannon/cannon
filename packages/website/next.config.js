/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push('pino-pretty', 'lokijs', 'encoding', 'solc');
    return config;
  },
  experimental: {
    mdxRs: true,
  },
};

const withMDX = require('@next/mdx')();

module.exports = withMDX(nextConfig);
