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

  @ApiPropertyOptional({ description: 'Phone number (international format)' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  website?: string;

  @ApiPropertyOptional({
    description: 'Social media and messenger links',
    type: 'object',
    properties: {
      facebook: { type: 'string' },
      instagram: { type: 'string' },
      twitter: { type: 'string' },
      telegram: { type: 'string' },
      whatsapp: { type: 'string' },
      viber: { type: 'string' },
      messenger: { type: 'string' },
    },
  })
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    telegram?: string;
    whatsapp?: string;
    viber?: string;
    messenger?: string;
  };

  @ApiProperty({ description: 'Venue status', enum: ['active', 'hidden', 'duplicate'] })
  status!: 'active' | 'hidden' | 'duplicate';

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}
