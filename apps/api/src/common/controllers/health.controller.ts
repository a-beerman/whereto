import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiExtraModels } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { HealthCheckResponse } from '../dto/common-responses';

@ApiTags('health')
@ApiExtraModels(HealthCheckResponse)
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
    type: HealthCheckResponse,
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
