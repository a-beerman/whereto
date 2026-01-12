import { ApiProperty } from '@nestjs/swagger';

export class HealthIndicatorStatus {
  @ApiProperty({ description: 'Indicator status' })
  status!: string;
}

export class HealthInfo implements Record<string, unknown> {
  // Dynamic health indicators from NestJS Terminus
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export class HealthError implements Record<string, unknown> {
  // Dynamic error indicators from NestJS Terminus
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export class HealthDetails implements Record<string, unknown> {
  // Dynamic health details from NestJS Terminus
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export class HealthCheckResponse {
  @ApiProperty({ description: 'Health status' })
  status!: string;

  @ApiProperty({
    description: 'Health info - dynamic object with health indicators',
    type: 'object',
    additionalProperties: { type: 'object' },
  })
  info!: HealthInfo;

  @ApiProperty({
    description: 'Health errors - dynamic object with error indicators',
    type: 'object',
    additionalProperties: { type: 'object' },
  })
  error!: HealthError;

  @ApiProperty({
    description: 'Health details - dynamic object with detailed health information',
    type: 'object',
    additionalProperties: true,
  })
  details!: HealthDetails;
}

export class EndpointLatencyStats {
  @ApiProperty({ description: '50th percentile latency in milliseconds' })
  p50!: number;

  @ApiProperty({ description: '95th percentile latency in milliseconds' })
  p95!: number;

  @ApiProperty({ description: '99th percentile latency in milliseconds' })
  p99!: number;

  @ApiProperty({ description: 'Number of requests' })
  count!: number;
}

export class LatencyStatsData implements Record<string, EndpointLatencyStats> {
  // Dynamic object with endpoint keys (format: "METHOD /path") and EndpointLatencyStats values
  [endpoint: string]: EndpointLatencyStats;
}

export class GetLatencyStatsResponse {
  @ApiProperty({
    description: 'Latency statistics by endpoint (key format: "METHOD /path")',
    type: LatencyStatsData,
  })
  data!: LatencyStatsData;

  @ApiProperty({ description: 'Timestamp', format: 'date-time' })
  timestamp!: string;
}

export class GetHealthMetricsResponse {
  @ApiProperty({ description: 'Health status' })
  status!: string;

  @ApiProperty({ description: 'Timestamp', format: 'date-time' })
  timestamp!: string;
}
