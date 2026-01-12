import { ApiProperty } from '@nestjs/swagger';

export class Meta {
  @ApiProperty({ description: 'Total number of items' })
  total!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;

  @ApiProperty({ description: 'Pagination offset' })
  offset!: number;

  @ApiProperty({ description: 'Cursor for next page', nullable: true, required: false })
  nextCursor?: string;
}

export class ItemResponse<T = unknown> {
  @ApiProperty({ description: 'Response payload' })
  // Using unknown for Swagger compatibility; concrete type provided via allOf in controllers
  data!: T;
}

export class PaginatedResponse<T = unknown> {
  @ApiProperty({ description: 'List of items', type: 'array' })
  // Using unknown[] for Swagger compatibility; item type provided via allOf in controllers
  data!: T[];

  @ApiProperty({ description: 'Pagination metadata', type: Meta })
  meta!: Meta;
}
