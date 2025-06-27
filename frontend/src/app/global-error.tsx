'use client';

import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    // Capture the error with additional context
    Sentry.withScope((scope) => {
      if (error.digest) {
        scope.setTag('error_digest', error.digest);
        scope.setContext('error_details', { digest: error.digest });
        console.error('Error digest:', error.digest);
      }
      scope.setTag('error_boundary', 'global');
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <html>
      <body>
        {/* `NextError` is the default Next.js error page component. Its type
        definition requires a `statusCode` prop. However, since the App Router
        does not expose status codes for errors, we simply pass 0 to render a
        generic error message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
