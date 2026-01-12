import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SocialMediaLinks {
  @ApiPropertyOptional({ description: 'Facebook page URL' })
  facebook?: string;

  @ApiPropertyOptional({ description: 'Instagram profile URL' })
  instagram?: string;

  @ApiPropertyOptional({ description: 'Twitter/X profile URL' })
  twitter?: string;

  @ApiPropertyOptional({ description: 'Telegram channel/group URL' })
  telegram?: string;

  @ApiPropertyOptional({ description: 'WhatsApp contact URL' })
  whatsapp?: string;

  @ApiPropertyOptional({ description: 'Viber contact URL' })
  viber?: string;

  @ApiPropertyOptional({ description: 'Facebook Messenger URL' })
  messenger?: string;
}

export class OpeningHoursPeriod {
  @ApiProperty({ description: 'Day of week (0-6, Sunday-Saturday)' })
  open!: {
    day: number;
    time: string;
  };

  @ApiPropertyOptional({ description: 'Closing time' })
  close?: {
    day: number;
    time: string;
  };
}

export class OpeningHours {
  @ApiPropertyOptional({ description: 'Whether venue is open now' })
  open_now?: boolean;

  @ApiPropertyOptional({ description: 'Opening hours periods', type: [OpeningHoursPeriod] })
  periods?: OpeningHoursPeriod[];

  @ApiPropertyOptional({ description: 'Human-readable weekday text', type: [String] })
  weekday_text?: string[];

  @ApiPropertyOptional({ description: 'Formatted hours string' })
  formatted?: string;
}

export class VenueResponse {
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

  @ApiPropertyOptional({ description: 'Opening hours (formatted or raw)', type: OpeningHours })
  hours?: OpeningHours;

  @ApiPropertyOptional({ description: 'Phone number (international format)' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  website?: string;

  @ApiPropertyOptional({
    description: 'Social media and messenger links',
    type: SocialMediaLinks,
  })
  socialMedia?: SocialMediaLinks;

  @ApiProperty({ description: 'Venue status', enum: ['active', 'hidden', 'duplicate'] })
  status!: 'active' | 'hidden' | 'duplicate';

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}
