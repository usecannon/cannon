/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push('pino-pretty', 'lokijs', 'encoding', 'solc');
    return config;
  },
  experimental: {
    urlImports: ['https://unpkg.com'],
  },
  rewrites: [
    {
      source: '/packages/:name',
      destination: '/packages/[name].html',
    },
  ],
};

module.exports = nextConfig;
