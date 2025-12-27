import { ApiProperty } from '@nestjs/swagger';

export class MetaDto {
  @ApiProperty({ description: 'Total number of items' })
  total!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;

  @ApiProperty({ description: 'Pagination offset' })
  offset!: number;

  @ApiProperty({ description: 'Cursor for next page', nullable: true, required: false })
  nextCursor?: string;
}

export class ItemResponseDto<T = any> {
  @ApiProperty({ description: 'Response payload' })
  // Using any for Swagger compatibility; concrete type provided via allOf in controllers
  data!: T;
}

export class PaginatedResponseDto<T = any> {
  @ApiProperty({ description: 'List of items', type: 'array' })
  // Using any[] for Swagger compatibility; item type provided via allOf in controllers
  data!: T[];

  @ApiProperty({ description: 'Pagination metadata', type: MetaDto })
  meta!: MetaDto;
}
