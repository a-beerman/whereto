import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../services/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, path } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - start;

          // Record API latency
          this.metricsService.recordApiLatency({
            method,
            endpoint: path || url,
            duration,
            statusCode: response.statusCode,
          });
        },
        error: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - start;

          // Record latency even for errors
          this.metricsService.recordApiLatency({
            method,
            endpoint: path || url,
            duration,
            statusCode: response.statusCode || 500,
          });
        },
      }),
    );
  }
}
