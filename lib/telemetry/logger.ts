// lib/telemetry/logger.ts - Structured logging for AI operations
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMetadata {
  [key: string]: any;
}

/**
 * Structured logger for AI operations
 */
class Logger {
  private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...metadata,
    };

    // In production, this could send to a logging service (e.g., DataDog, LogRocket)
    const logMessage = JSON.stringify(logData);

    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(logMessage);
        }
        break;
      case 'info':
      default:
        console.log(logMessage);
    }
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: LogMetadata): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: LogMetadata): void {
    this.log('error', message, metadata);
  }
}

export const logger = new Logger();

/**
 * Log AI operations with consistent structure
 */
export function logAIOperation(operation: string, metadata: LogMetadata): void {
  logger.info(`AI_OPERATION: ${operation}`, metadata);
}
