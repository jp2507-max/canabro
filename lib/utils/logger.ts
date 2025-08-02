// filepath: c:\\Users\\Peter\\canabro\\lib\\utils\\logger.ts
/**
 * Basic Logger Utility
 *
 * Provides simple logging functionalities.
 * Replace with a more robust logger (e.g., Sentry, Winston, or a custom solution) as needed.
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

// Basic console logger, can be expanded
function logMessage(level: LogLevel, message: string, ...optionalParams: unknown[]): void {
  const timestamp = new Date().toISOString();
  const messagePrefix = `[${timestamp}] [${level}] ${message}`;

  switch (level) {
    case 'DEBUG':
      // Route debug to warn to satisfy ESLint (only warn/error allowed)
      console.warn(messagePrefix, ...optionalParams);
      break;
    case 'INFO':
      // Route info to warn to satisfy ESLint (only warn/error allowed)
      console.warn(messagePrefix, ...optionalParams);
      break;
    case 'WARN':
      console.warn(messagePrefix, ...optionalParams);
      break;
    case 'ERROR':
      console.error(messagePrefix, ...optionalParams);
      break;
    default: {
      // Exhaustive check safeguard
      const _exhaustive: never = level as never;
      // Fallback to warn to satisfy ESLint policy
      console.warn(messagePrefix, ...optionalParams);
      return _exhaustive;
    }
  }
}

export const log = {
  debug: (message: string, ...optionalParams: unknown[]) =>
    logMessage('DEBUG', message, ...optionalParams),
  info: (message: string, ...optionalParams: unknown[]) =>
    logMessage('INFO', message, ...optionalParams),
  warn: (message: string, ...optionalParams: unknown[]) =>
    logMessage('WARN', message, ...optionalParams),
  error: (message: string, ...optionalParams: unknown[]) =>
    logMessage('ERROR', message, ...optionalParams),
};

// Example of a more specific logger if needed, e.g., for API calls
type JsonLike =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonLike }
  | JsonLike[];

export const apiLogger = {
  logApiRequest: (url: string, method: string, params?: JsonLike | Record<string, unknown> | unknown) => {
    log.debug(`API Request: ${method} ${url}`, params ?? '');
  },
  logApiResponse: (url: string, method: string, status: number, response?: JsonLike | Record<string, unknown> | unknown) => {
    log.debug(`API Response: ${method} ${url} - Status: ${status}`, response ?? '');
  },
  logApiError: (url: string, method: string, error: unknown) => {
    log.error(`API Error: ${method} ${url}`, error);
  },
};
