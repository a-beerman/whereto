import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../services/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, path } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const duration = Date.now() - start;

          // Record API latency
          this.metricsService.recordApiLatency({
            method: method || '',
            endpoint: path || url || '',
            duration,
            statusCode: response.statusCode,
          });
        },
        error: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const duration = Date.now() - start;

          // Record latency even for errors
          this.metricsService.recordApiLatency({
            method: method || '',
            endpoint: path || url || '',
            duration,
            statusCode: response.statusCode || 500,
          });
        },
      }),
    );
  }
}
