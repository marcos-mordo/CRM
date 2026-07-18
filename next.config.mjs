import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  // imapflow y pino usan require dinámicos que el tracer de Next no sigue.
  // Forzamos su inclusión en el bundle standalone (email sync 2-way).
  outputFileTracingIncludes: {
    '/api/cron/sync-emails': ['./node_modules/imapflow/**/*', './node_modules/pino/**/*', './node_modules/@zone-eu/**/*'],
    '/settings/email': ['./node_modules/imapflow/**/*', './node_modules/pino/**/*', './node_modules/@zone-eu/**/*'],
    '/contacts/**': ['./node_modules/imapflow/**/*', './node_modules/pino/**/*', './node_modules/@zone-eu/**/*'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self), interest-cohort=()' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
