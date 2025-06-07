// filepath: c:\\Users\\Peter\\canabro\\lib\\utils\\logger.ts
/**
 * Basic Logger Utility
 *
 * Provides simple logging functionalities.
 * Replace with a more robust logger (e.g., Sentry, Winston, or a custom solution) as needed.
 */

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// Basic console logger, can be expanded
function logMessage(level: LogLevel, message: string, ...optionalParams: unknown[]): void {
  const timestamp = new Date().toISOString();
  const messagePrefix = `[${timestamp}] [${level}] ${message}`;

  switch (level) {
    case LogLevel.DEBUG:
      console.debug(messagePrefix, ...(optionalParams as any[]));
      break;
    case LogLevel.INFO:
      console.info(messagePrefix, ...(optionalParams as any[]));
      break;
    case LogLevel.WARN:
      console.warn(messagePrefix, ...(optionalParams as any[]));
      break;
    case LogLevel.ERROR:
      console.error(messagePrefix, ...(optionalParams as any[]));
      break;
    default: {
      // Exhaustive check – will error at compile-time if a new enum member appears
      const _exhaustive: never = level;
      console.log(messagePrefix, ...(optionalParams as any[]));
      return _exhaustive;
    }
  }
}

export const log = {
  debug: (message: string, ...optionalParams: unknown[]) =>
    logMessage(LogLevel.DEBUG, message, ...optionalParams),
  info: (message: string, ...optionalParams: unknown[]) =>
    logMessage(LogLevel.INFO, message, ...optionalParams),
  warn: (message: string, ...optionalParams: unknown[]) =>
    logMessage(LogLevel.WARN, message, ...optionalParams),
  error: (message: string, ...optionalParams: unknown[]) =>
    logMessage(LogLevel.ERROR, message, ...optionalParams),
};

// Example of a more specific logger if needed, e.g., for API calls
export const apiLogger = {
  logApiRequest: (url: string, method: string, params?: any) => {
    log.debug(`API Request: ${method} ${url}`, params || '');
  },
  logApiResponse: (url: string, method: string, status: number, response?: any) => {
    log.debug(`API Response: ${method} ${url} - Status: ${status}`, response || '');
  },
  logApiError: (url: string, method: string, error: any) => {
    log.error(`API Error: ${method} ${url}`, error);
  },
};
