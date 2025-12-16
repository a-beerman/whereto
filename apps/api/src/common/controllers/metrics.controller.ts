import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from '../services/metrics.service';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('Metrics')
@Controller('metrics')
@UseGuards(ThrottlerGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('latency')
  @ApiOperation({ summary: 'Get API latency statistics (p50, p95, p99)' })
  @ApiResponse({ status: 200, description: 'Latency statistics by endpoint' })
  getLatencyStats() {
    const stats = this.metricsService.getAllLatencyStats();
    return {
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get health metrics' })
  @ApiResponse({ status: 200, description: 'Health metrics' })
  getHealthMetrics() {
    // This is a simple health check endpoint
    // In production, you might want to add more detailed health metrics
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
