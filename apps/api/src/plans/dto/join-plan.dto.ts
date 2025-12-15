import { IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PreferencesDto {
  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsString()
  budget?: string;

  @IsOptional()
  @IsString()
  cuisine?: string; // Comma-separated or JSON array

  @IsOptional()
  @IsString()
  alcohol?: 'yes' | 'no' | 'neutral';

  @IsOptional()
  quiet?: boolean;

  @IsOptional()
  outdoor?: boolean;

  @IsOptional()
  kidsFriendly?: boolean;
}

export class JoinPlanDto {
  @IsString()
  userId!: string; // Telegram user ID

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences?: PreferencesDto;

  @IsOptional()
  @IsString()
  locationLat?: string; // For midpoint calculation

  @IsOptional()
  @IsString()
  locationLng?: string;
}
