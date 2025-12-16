import { IsString, IsOptional, IsObject, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PreferencesDto {
  @ApiPropertyOptional({ description: 'Format/type', example: 'dinner' })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({ description: 'Budget level', enum: ['$', '$$', '$$$'] })
  @IsOptional()
  @IsString()
  budget?: string;

  @ApiPropertyOptional({ description: 'Cuisine preferences' })
  @IsOptional()
  @IsString()
  cuisine?: string; // Comma-separated or JSON array

  @ApiPropertyOptional({ description: 'Alcohol preference', enum: ['yes', 'no', 'neutral'] })
  @IsOptional()
  @IsString()
  alcohol?: 'yes' | 'no' | 'neutral';

  @ApiPropertyOptional({ description: 'Quiet venue preference' })
  @IsOptional()
  quiet?: boolean;

  @ApiPropertyOptional({ description: 'Outdoor seating preference' })
  @IsOptional()
  outdoor?: boolean;

  @ApiPropertyOptional({ description: 'Kids-friendly preference' })
  @IsOptional()
  kidsFriendly?: boolean;
}

export class JoinPlanDto {
  @ApiProperty({ description: 'Telegram user ID' })
  @IsString()
  userId!: string; // Telegram user ID

  @ApiPropertyOptional({ description: 'User preferences', type: PreferencesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences?: PreferencesDto;

  @ApiPropertyOptional({ description: 'User location latitude (for midpoint calculation)' })
  @IsOptional()
  @IsString()
  locationLat?: string; // For midpoint calculation

  @ApiPropertyOptional({ description: 'User location longitude (for midpoint calculation)' })
  @IsOptional()
  @IsString()
  locationLng?: string;
}
