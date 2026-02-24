/**
 * Production-safe Logger Utility
 *
 * Wraps console methods to only log in development mode.
 * Use this instead of console.log throughout the app.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enableInProduction: boolean;
  logLevel: LogLevel;
}

const config: LoggerConfig = {
  enableInProduction: false,
  logLevel: __DEV__ ? 'debug' : 'error',
};

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const shouldLog = (level: LogLevel): boolean => {
  if (!__DEV__ && !config.enableInProduction) {
    return level === 'error'; // Only errors in production
  }
  return LOG_LEVELS[level] >= LOG_LEVELS[config.logLevel];
};

/**
 * Production-safe logger
 * Only logs in development mode, except for errors
 */
export const logger = {
  /**
   * Debug logging - only in development
   */
  debug: (...args: any[]) => {
    if (shouldLog('debug')) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info logging - only in development
   */
  info: (...args: any[]) => {
    if (shouldLog('info')) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Warning logging - only in development
   */
  warn: (...args: any[]) => {
    if (shouldLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Error logging - always logs (including production)
   */
  error: (...args: any[]) => {
    if (shouldLog('error')) {
      console.error('[ERROR]', ...args);
    }
  },

  /**
   * Log with specific tag/category
   */
  tag: (tag: string) => ({
    debug: (...args: any[]) => {
      if (shouldLog('debug')) {
        console.log(`[${tag}]`, ...args);
      }
    },
    info: (...args: any[]) => {
      if (shouldLog('info')) {
        console.log(`[${tag}]`, ...args);
      }
    },
    warn: (...args: any[]) => {
      if (shouldLog('warn')) {
        console.warn(`[${tag}]`, ...args);
      }
    },
    error: (...args: any[]) => {
      if (shouldLog('error')) {
        console.error(`[${tag}]`, ...args);
      }
    },
  }),

  /**
   * Configure logger settings
   */
  configure: (options: Partial<LoggerConfig>) => {
    Object.assign(config, options);
  },
};

export default logger;
