import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    @InjectConnection()
    private connection: Connection,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint', operationId: 'Health_check' })
  @ApiOkResponse({
    description: 'Health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        info: { type: 'object' },
        error: { type: 'object' },
        details: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 503, description: 'Service Unavailable' })
  @HealthCheck()
  check() {
    return this.health.check([
      () => {
        return this.connection.isConnected
          ? { database: { status: 'up' } }
          : { database: { status: 'down' } };
      },
    ]);
  }
}
