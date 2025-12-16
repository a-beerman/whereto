import { Injectable, Logger } from '@nestjs/common';

export interface ProductEvent {
  event: 'search' | 'open_place' | 'save_place' | 'share_place' | 'open_plan_flow' | 'plan_created';
  userId?: string;
  cityId?: string;
  venueId?: string;
  planId?: string;
  query?: string;
  category?: string;
  resultCount?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ApiLatencyMetric {
  method: string;
  endpoint: string;
  duration: number;
  statusCode: number;
  timestamp: Date;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly latencyMetrics: ApiLatencyMetric[] = [];
  private readonly maxLatencyMetrics = 1000; // Keep last 1000 requests for percentile calculation

  /**
   * Track product events (search, open_place, save_place, share_place, open_plan_flow)
   */
  trackProductEvent(event: ProductEvent): void {
    // In production, this would send to analytics service (Mixpanel, Amplitude, etc.)
    // For MVP, we'll log structured events
    this.logger.log(`[PRODUCT_EVENT] ${event.event}`, {
      ...event,
      timestamp: event.timestamp.toISOString(),
    });

    // TODO: Integrate with analytics service
    // await this.analyticsService.track(event.event, event);
  }

  /**
   * Track API latency for percentile calculation
   */
  recordApiLatency(metric: Omit<ApiLatencyMetric, 'timestamp'>): void {
    const fullMetric: ApiLatencyMetric = {
      ...metric,
      timestamp: new Date(),
    };

    // Add to array (keep last N metrics)
    this.latencyMetrics.push(fullMetric);
    if (this.latencyMetrics.length > this.maxLatencyMetrics) {
      this.latencyMetrics.shift();
    }

    // Log slow requests
    if (metric.duration > 1000) {
      this.logger.warn(`[SLOW_REQUEST] ${metric.method} ${metric.endpoint} - ${metric.duration}ms`);
    }
  }

  /**
   * Calculate latency percentiles (p50, p95, p99) for an endpoint
   */
  getLatencyPercentiles(
    method: string,
    endpoint: string,
  ): { p50: number; p95: number; p99: number; count: number } | null {
    const relevantMetrics = this.latencyMetrics.filter(
      (m) => m.method === method && m.endpoint === endpoint,
    );

    if (relevantMetrics.length === 0) {
      return null;
    }

    const durations = relevantMetrics.map((m) => m.duration).sort((a, b) => a - b);

    const p50 = durations[Math.floor(durations.length * 0.5)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    return {
      p50: p50 || 0,
      p95: p95 || 0,
      p99: p99 || 0,
      count: durations.length,
    };
  }

  /**
   * Get all endpoint latency statistics
   */
  getAllLatencyStats(): Record<string, { p50: number; p95: number; p99: number; count: number }> {
    const endpointMap = new Map<string, number[]>();

    // Group by endpoint
    for (const metric of this.latencyMetrics) {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!endpointMap.has(key)) {
        endpointMap.set(key, []);
      }
      endpointMap.get(key)!.push(metric.duration);
    }

    const stats: Record<string, { p50: number; p95: number; p99: number; count: number }> = {};

    for (const [endpoint, durations] of endpointMap.entries()) {
      durations.sort((a, b) => a - b);
      const count = durations.length;
      stats[endpoint] = {
        p50: durations[Math.floor(count * 0.5)] || 0,
        p95: durations[Math.floor(count * 0.95)] || 0,
        p99: durations[Math.floor(count * 0.99)] || 0,
        count,
      };
    }

    return stats;
  }

  /**
   * Clear latency metrics (useful for testing or periodic cleanup)
   */
  clearLatencyMetrics(): void {
    this.latencyMetrics.length = 0;
  }
}
