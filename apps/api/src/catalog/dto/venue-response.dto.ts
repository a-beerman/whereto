import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VenueResponseDto {
  @ApiProperty({ description: 'Venue ID (UUID)' })
  id!: string;

  @ApiProperty({ description: 'City ID (UUID)' })
  cityId!: string;

  @ApiProperty({ description: 'Venue name' })
  name!: string;

  @ApiProperty({ description: 'Venue address' })
  address!: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  lng?: number;

  @ApiPropertyOptional({ description: 'Categories', type: [String] })
  categories?: string[];

  @ApiPropertyOptional({ description: 'Rating (0-5)' })
  rating?: number;

  @ApiPropertyOptional({ description: 'Number of ratings' })
  ratingCount?: number;

  @ApiPropertyOptional({
    description: 'Photo references (for backward compatibility)',
    type: [String],
  })
  photoRefs?: string[]; // Photo references (for backward compatibility)

  @ApiPropertyOptional({ description: 'Photo URLs (converted from references)', type: [String] })
  photoUrls?: string[]; // Photo URLs (converted from references)

  @ApiPropertyOptional({ description: 'Opening hours (formatted or raw)' })
  hours?: any; // Opening hours (formatted or raw)

  @ApiProperty({ description: 'Venue status', enum: ['active', 'hidden', 'duplicate'] })
  status!: 'active' | 'hidden' | 'duplicate';

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}
