import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  transpilePackages: ['motion'],
  webpack: (config, { dev }) => {
    const vendorModules = path.resolve('C:/Users/ranquine/.recon_correlator_vendor/node_modules');
    config.resolve.modules = [
      vendorModules,
      ...(config.resolve.modules || ['node_modules']),
    ];
    config.resolveLoader = config.resolveLoader || {};
    config.resolveLoader.modules = [
      vendorModules,
      ...(config.resolveLoader.modules || ['node_modules']),
    ];

    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
      'lucide-react': path.resolve(__dirname, 'lib/icons.tsx'),
    };

    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
