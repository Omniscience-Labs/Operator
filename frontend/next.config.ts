import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

let nextConfig: NextConfig = {
  webpack: (config) => {
    // This rule prevents issues with pdf.js and canvas
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];

    // Ensure node native modules are ignored
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };

    return config;
  },
};

if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' || process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview') {
  nextConfig = withSentryConfig(nextConfig, {
    org: 'omni-ai',
    project: 'operator-nextjs',
    silent: !process.env.CI,
    widenClientFileUpload: true,
    tunnelRoute: '/monitoring',
    disableLogger: true,
    automaticVercelMonitors: true,
  });
}

export default nextConfig;
