import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    interface ErrorResponse {
      statusCode: number;
      timestamp: string;
      path: string;
      method: string;
      correlationId?: string;
      message: unknown;
      error?: string;
      stack?: string;
      errors?: unknown;
      details?: unknown;
    }

    const requestWithCorrelationId = request as Request & { correlationId?: string };
    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      correlationId: requestWithCorrelationId.correlationId,
      message:
        typeof message === 'string'
          ? message
          : typeof message === 'object' && message !== null && 'message' in message
            ? String((message as { message: unknown }).message)
            : JSON.stringify(message),
    };

    // Include validation error details if available
    if (typeof message === 'object' && message !== null) {
      const msgObj = message as Record<string, unknown>;
      if ('errors' in msgObj) {
        errorResponse.errors = msgObj.errors;
      }
      if ('details' in msgObj) {
        errorResponse.details = msgObj.details;
      }
    }

    // Include error details in development mode
    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      errorResponse.error = exception.message;
      errorResponse.stack = exception.stack;
    }

    // Log error with structured context (error tracking service can be injected if needed)
    if (exception instanceof Error && status >= 500) {
      this.logger.error({
        message: exception.message,
        stack: exception.stack,
        correlationId: requestWithCorrelationId.correlationId,
        userId: request.headers['x-user-id'] as string,
        endpoint: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
      });
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} - ${status}`);
    }

    response.status(status).json(errorResponse);
  }
}
