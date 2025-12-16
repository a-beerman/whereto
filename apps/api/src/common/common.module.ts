import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { MetricsService } from './services/metrics.service';
import { ErrorTrackingService } from './services/error-tracking.service';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';
import { CorrelationIdInterceptor } from './interceptors/correlation-id.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { MetricsController } from './controllers/metrics.controller';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    MetricsService,
    ErrorTrackingService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CorrelationIdInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
  exports: [MetricsService, ErrorTrackingService],
})
export class CommonModule {}
