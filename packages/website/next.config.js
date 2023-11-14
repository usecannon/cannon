/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push('pino-pretty', 'lokijs', 'encoding', 'solc');
    return config;
  },
  experimental: {
    urlImports: ['https://unpkg.com'],
  },
};

module.exports = nextConfig;
