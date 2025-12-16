import { Injectable, Logger } from '@nestjs/common';

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  body?: any;
  query?: any;
  params?: any;
  metadata?: Record<string, any>;
}

@Injectable()
export class ErrorTrackingService {
  private readonly logger = new Logger(ErrorTrackingService.name);

  /**
   * Capture and log error with context
   * In production, this would send to error tracking service (Sentry, Rollbar, etc.)
   */
  captureException(error: Error, context?: ErrorContext): void {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context,
      timestamp: new Date().toISOString(),
    };

    // Log error with structured context
    this.logger.error(`[ERROR] ${error.message}`, {
      ...errorInfo,
      context: JSON.stringify(context),
    });

    // TODO: Integrate with error tracking service (e.g., Sentry)
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureException(error, {
    //     tags: {
    //       component: context?.endpoint || 'unknown',
    //     },
    //     extra: context,
    //   });
    // }
  }

  /**
   * Capture error message without exception object
   */
  captureMessage(message: string, context?: ErrorContext): void {
    this.logger.error(`[ERROR] ${message}`, {
      message,
      context: JSON.stringify(context),
      timestamp: new Date().toISOString(),
    });

    // TODO: Integrate with error tracking service
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureMessage(message, {
    //     level: 'error',
    //     extra: context,
    //   });
    // }
  }
}
