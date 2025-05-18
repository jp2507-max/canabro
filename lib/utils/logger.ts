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
function logMessage(level: LogLevel, message: string, ...optionalParams: any[]): void {
  const timestamp = new Date().toISOString();
  console[level.toLowerCase()](`[${timestamp}] [${level}] ${message}`, ...optionalParams);
}

export const log = {
  debug: (message: string, ...optionalParams: any[]) => logMessage(LogLevel.DEBUG, message, ...optionalParams),
  info: (message: string, ...optionalParams: any[]) => logMessage(LogLevel.INFO, message, ...optionalParams),
  warn: (message: string, ...optionalParams: any[]) => logMessage(LogLevel.WARN, message, ...optionalParams),
  error: (message: string, ...optionalParams: any[]) => logMessage(LogLevel.ERROR, message, ...optionalParams),
};

// Example of a more specific logger if needed, e.g., for API calls
export const apiLogger = {
  logApiRequest: (url: string, method: string, params?: any) => {
    log.debug(\`API Request: \${method} \${url}\`, params || '');
  },
  logApiResponse: (url: string, method: string, status: number, response?: any) => {
    log.debug(\`API Response: \${method} \${url} - Status: \${status}\`, response || '');
  },
  logApiError: (url: string, method: string, error: any) => {
    log.error(\`API Error: \${method} \${url}\`, error);
  },
};
