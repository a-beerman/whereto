import { ApiProperty } from '@nestjs/swagger';

export class SyncMetrics {
  @ApiProperty({ description: 'Sync duration in milliseconds' })
  duration!: number;

  @ApiProperty({ description: 'Number of venues processed' })
  venuesProcessed!: number;

  @ApiProperty({ description: 'Number of duplicates found' })
  duplicates!: number;

  @ApiProperty({ description: 'Number of errors' })
  errors!: number;
}

export class SyncCityData {
  @ApiProperty({ description: 'Whether sync was successful' })
  success!: boolean;

  @ApiProperty({ type: SyncMetrics })
  metrics!: SyncMetrics;
}

export class SyncCityResponse {
  @ApiProperty({ type: SyncCityData })
  data!: SyncCityData;
}
