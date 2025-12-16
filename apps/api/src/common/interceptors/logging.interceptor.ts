import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, path, correlationId, headers } = request;
    const userId = headers['x-user-id'] || headers['x-merchant-user-id'] || 'anonymous';
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const delay = Date.now() - now;

          // Structured logging with context
          this.logger.log({
            message: `${method} ${path || url} ${response.statusCode}`,
            method,
            path: path || url,
            statusCode: response.statusCode,
            duration: delay,
            correlationId,
            userId,
            timestamp: new Date().toISOString(),
          });
        },
        error: (error) => {
          const response = context.switchToHttp().getResponse();
          const delay = Date.now() - now;

          // Structured error logging
          this.logger.error({
            message: `${method} ${path || url} - ${error.message}`,
            method,
            path: path || url,
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
