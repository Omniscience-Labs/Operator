import * as Sentry from '@sentry/nextjs';
import { SentryConfig } from './sentry.config';

Sentry.init(SentryConfig);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
//test