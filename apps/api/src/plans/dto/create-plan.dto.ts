import { IsString, IsDateString, IsOptional, IsUUID, Matches, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiEnumPropertyOptional } from '../../common/decorators/api-enum-property.decorator';

export enum BudgetLevel {
  LOW = '$',
  MEDIUM = '$$',
  HIGH = '$$$',
}

export class CreatePlanDto {
  @ApiProperty({ description: 'Telegram chat ID' })
  @IsString()
  telegramChatId!: string; // Will be converted to number

  @ApiProperty({ description: 'Telegram user ID of plan initiator' })
  @IsString()
  initiatorId!: string; // Telegram user ID

  @ApiProperty({ description: 'Plan date (ISO date string)', example: '2024-01-15' })
  @IsDateString()
  date!: string; // ISO date string

  @ApiProperty({ description: 'Plan time (HH:mm format)', example: '19:00' })
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:mm format',
  })
  time!: string;

  @ApiPropertyOptional({ description: 'Area/location name' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ description: 'City ID (UUID)' })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({ description: 'Location latitude' })
  @IsOptional()
  @IsString()
  locationLat?: string; // Will be converted to number

  @ApiPropertyOptional({ description: 'Location longitude' })
  @IsOptional()
  @IsString()
  locationLng?: string; // Will be converted to number

  @ApiEnumPropertyOptional(BudgetLevel, 'Budget level', BudgetLevel.MEDIUM)
  @IsOptional()
  @IsEnum(BudgetLevel)
  budget?: BudgetLevel;

  @ApiPropertyOptional({ description: 'Format/type', example: 'dinner' })
  @IsOptional()
  @IsString()
  format?: string; // 'dinner', 'bar', 'coffee', etc.
}
