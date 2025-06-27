import { consoleLoggingIntegration, type init } from '@sentry/nextjs';

type SentryConfig = Parameters<typeof init>[0];

export const SentryConfig: SentryConfig = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: process.env.NODE_ENV !== 'production', // Enable debug in staging
  _experiments: { enableLogs: true },
  integrations: [consoleLoggingIntegration()],
  beforeSend(event, hint) {
    // Capture the original error even if Next.js obscures it
    if (hint.originalException) {
      console.error('Original error:', hint.originalException);
    }
    return event;
  },
  initialScope: {
    tags: {
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    },
  },
};
