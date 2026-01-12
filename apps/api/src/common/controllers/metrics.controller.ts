import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiExtraModels } from '@nestjs/swagger';
import { MetricsService } from '../services/metrics.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GetLatencyStatsResponse, GetHealthMetricsResponse } from '../dto/common-responses';

@ApiTags('metrics')
@ApiExtraModels(GetLatencyStatsResponse, GetHealthMetricsResponse)
@Controller('metrics')
@UseGuards(ThrottlerGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('latency')
  @ApiOperation({ summary: 'Get latency statistics', operationId: 'Metrics_getLatencyStats' })
  @ApiOkResponse({
    description: 'Latency statistics',
    type: GetLatencyStatsResponse,
  })
  getLatencyStats() {
    const stats = this.metricsService.getAllLatencyStats();
    return {
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get health metrics', operationId: 'Metrics_getHealthMetrics' })
  @ApiOkResponse({
    description: 'Health metrics',
    type: GetHealthMetricsResponse,
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
