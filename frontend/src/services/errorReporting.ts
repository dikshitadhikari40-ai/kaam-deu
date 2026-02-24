/**
 * Error Reporting Service
 *
 * Centralized error reporting that integrates with Sentry in production.
 * Install Sentry: npm install @sentry/react-native
 *
 * Setup Sentry in your Supabase/Backend dashboard:
 * 1. Create account at https://sentry.io
 * 2. Create a new React Native project
 * 3. Copy DSN to EXPO_PUBLIC_SENTRY_DSN in .env.production
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Check if Sentry DSN is configured
const SENTRY_DSN = Constants.expoConfig?.extra?.sentryDsn ||
                   process.env.EXPO_PUBLIC_SENTRY_DSN ||
                   '';

const IS_PRODUCTION = !__DEV__;
const IS_SENTRY_CONFIGURED = !!SENTRY_DSN;

// Sentry instance placeholder - will be initialized if available
let Sentry: any = null;
let sentryInitialized = false;

// Try to load Sentry synchronously using require
const tryLoadSentry = (): any => {
  try {
    return require('@sentry/react-native');
  } catch {
    return null;
  }
};

// Initialize Sentry if configured
export const initErrorReporting = async () => {
  if (!IS_SENTRY_CONFIGURED) {
    if (__DEV__) {
      console.log('[ErrorReporting] Sentry DSN not configured - errors will only be logged to console');
    }
    return;
  }

  if (sentryInitialized) {
    return;
  }

  Sentry = tryLoadSentry();

  if (!Sentry) {
    if (__DEV__) {
      console.log('[ErrorReporting] @sentry/react-native not installed - using console logging');
      console.log('To enable Sentry, run: npm install @sentry/react-native');
    }
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      debug: __DEV__,
      environment: __DEV__ ? 'development' : 'production',
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,
      beforeSend: (event: any) => {
        if (__DEV__) {
          console.log('[Sentry] Would send event:', event.message || event.exception);
          return null;
        }
        return event;
      },
    });

    sentryInitialized = true;
    console.log('[ErrorReporting] Sentry initialized successfully');
  } catch (error) {
    if (__DEV__) {
      console.log('[ErrorReporting] Sentry initialization failed:', error);
    }
    Sentry = null;
  }
};

// Error severity levels
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

// User context for error reports
interface UserContext {
  id?: string;
  email?: string;
  role?: string;
}

let currentUserContext: UserContext = {};

/**
 * Set user context for error reports
 */
export const setUserContext = (user: UserContext | null) => {
  currentUserContext = user || {};

  if (Sentry) {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        role: user.role,
      });
    } else {
      Sentry.setUser(null);
    }
  }
};

/**
 * Capture an error and send to Sentry
 */
export const captureError = (
  error: Error | string,
  context?: {
    severity?: ErrorSeverity;
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    fingerprint?: string[];
  }
) => {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  const severity = context?.severity || 'error';

  // Always log to console in development
  if (__DEV__) {
    console.error(`[${severity.toUpperCase()}]`, errorObj.message, {
      ...context?.extra,
      tags: context?.tags,
    });
  }

  // Send to Sentry if available
  if (Sentry && IS_PRODUCTION) {
    Sentry.withScope((scope: any) => {
      scope.setLevel(severity);

      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      if (context?.extra) {
        scope.setExtras(context.extra);
      }

      if (context?.fingerprint) {
        scope.setFingerprint(context.fingerprint);
      }

      // Add platform info
      scope.setTag('platform', Platform.OS);
      scope.setTag('platform_version', String(Platform.Version));

      Sentry.captureException(errorObj);
    });
  }
};

/**
 * Capture a message (non-error event)
 */
export const captureMessage = (
  message: string,
  severity: ErrorSeverity = 'info',
  extra?: Record<string, any>
) => {
  if (__DEV__) {
    console.log(`[${severity.toUpperCase()}]`, message, extra);
  }

  if (Sentry && IS_PRODUCTION) {
    Sentry.withScope((scope: any) => {
      scope.setLevel(severity);
      if (extra) {
        scope.setExtras(extra);
      }
      Sentry.captureMessage(message);
    });
  }
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (
  message: string,
  category: string,
  data?: Record<string, any>
) => {
  if (Sentry) {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    });
  }

  if (__DEV__) {
    console.log(`[Breadcrumb:${category}]`, message, data);
  }
};

/**
 * Wrap an async function with error reporting
 */
export const withErrorReporting = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: { name?: string; tags?: Record<string, string> }
): T => {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(error as Error, {
        tags: {
          ...context?.tags,
          function: context?.name || fn.name || 'anonymous',
        },
        extra: { args },
      });
      throw error;
    }
  }) as T;
};

/**
 * Create a wrapped error handler for React components
 */
export const createErrorHandler = (componentName: string) => ({
  onError: (error: Error, errorInfo?: { componentStack?: string }) => {
    captureError(error, {
      severity: 'error',
      tags: { component: componentName },
      extra: { componentStack: errorInfo?.componentStack },
    });
  },
});

// Export error reporting service
export const errorReportingService = {
  init: initErrorReporting,
  setUser: setUserContext,
  captureError,
  captureMessage,
  addBreadcrumb,
  withErrorReporting,
  createErrorHandler,
  isConfigured: IS_SENTRY_CONFIGURED,
};

export default errorReportingService;
