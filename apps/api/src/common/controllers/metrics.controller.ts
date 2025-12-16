import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { MetricsService } from '../services/metrics.service';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('metrics')
@Controller('metrics')
@UseGuards(ThrottlerGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('latency')
  @ApiOperation({ summary: 'Get latency statistics' })
  @ApiOkResponse({
    description: 'Latency statistics',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'object' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  getLatencyStats() {
    const stats = this.metricsService.getAllLatencyStats();
    return {
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get health metrics' })
  @ApiOkResponse({
    description: 'Health metrics',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  getHealthMetrics() {
    // This is a simple health check endpoint
    // In production, you might want to add more detailed health metrics
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
