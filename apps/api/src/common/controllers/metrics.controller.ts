import { Controller, Get, UseGuards } from '@nestjs/common';
import { MetricsService } from '../services/metrics.service';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('metrics')
@UseGuards(ThrottlerGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('latency')
  getLatencyStats() {
    const stats = this.metricsService.getAllLatencyStats();
    return {
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  getHealthMetrics() {
    // This is a simple health check endpoint
    // In production, you might want to add more detailed health metrics
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
