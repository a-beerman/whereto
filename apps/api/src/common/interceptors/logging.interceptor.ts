import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { correlationId?: string }>();
    const { method, url, path, correlationId, body } = request;
    const headers = request.headers as Record<string, string | string[] | undefined>;
    const userIdHeader = headers['x-user-id'] || headers['x-merchant-user-id'];
    const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader || 'anonymous';
    const now = Date.now();

    // Log request body for POST/PUT/PATCH requests in development (helps debug validation errors)
    if (process.env.NODE_ENV !== 'production' && ['POST', 'PUT', 'PATCH'].includes(method || '')) {
      this.logger.debug({
        message: `Request body for ${method} ${path || url}`,
        method: method || '',
        path: path || url || '',
        body: body,
        correlationId,
        timestamp: new Date().toISOString(),
      });
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const delay = Date.now() - now;

          // Structured logging with context
          this.logger.log({
            message: `${method} ${path || url} ${response.statusCode}`,
            method: method || '',
            path: path || url || '',
            statusCode: response.statusCode,
            duration: delay,
            correlationId,
            userId,
            timestamp: new Date().toISOString(),
          });
        },
        error: (error: Error) => {
          const response = context.switchToHttp().getResponse<Response>();
          const delay = Date.now() - now;

          // Structured error logging
          this.logger.error({
            message: `${method} ${path || url} - ${error.message}`,
            method: method || '',
            path: path || url || '',
            statusCode: response.statusCode || 500,
            duration: delay,
            correlationId,
            userId,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          });
        },
      }),
    );
  }
}
