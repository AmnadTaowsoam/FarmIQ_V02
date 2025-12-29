type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  traceId?: string;
  tenantId?: string;
  userId?: string;
  [key: string]: unknown;
}

class Logger {
  private isDev = import.meta.env.DEV;
  private isProd = import.meta.env.PROD;

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDev) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.isDev || this.isProd) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : String(error),
    };
    console.error(this.formatMessage('error', message, errorContext));
    
    // In production, send to error tracking service (Sentry, etc.)
    if (this.isProd && typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: { custom: errorContext },
      });
    }
  }
}

export const logger = new Logger();

