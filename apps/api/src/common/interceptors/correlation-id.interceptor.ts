import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { correlationId?: string }>();
    const headers = request.headers as Record<string, string | string[] | undefined>;

    // Generate or use existing correlation ID
    const headerCorrelationId = Array.isArray(headers['x-correlation-id'])
      ? headers['x-correlation-id'][0]
      : headers['x-correlation-id'];
    const headerRequestId = Array.isArray(headers['x-request-id'])
      ? headers['x-request-id'][0]
      : headers['x-request-id'];
    const correlationId = headerCorrelationId || headerRequestId || uuidv4();

    // Attach to request for use in logs
    request.correlationId = correlationId;

    // Set response header
    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader('X-Correlation-ID', correlationId);

    return next.handle();
  }
}
