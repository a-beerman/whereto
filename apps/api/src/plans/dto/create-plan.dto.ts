import { IsString, IsDateString, IsOptional, IsUUID, Matches } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  telegramChatId!: string; // Will be converted to number

  @IsString()
  initiatorId!: string; // Telegram user ID

  @IsDateString()
  date!: string; // ISO date string

  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:mm format',
  })
  time!: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsUUID()
  cityId?: string;

  @IsOptional()
  @IsString()
  locationLat?: string; // Will be converted to number

  @IsOptional()
  @IsString()
  locationLng?: string; // Will be converted to number

  @IsOptional()
  @IsString()
  budget?: string; // '$', '$$', '$$$'

  @IsOptional()
  @IsString()
  format?: string; // 'dinner', 'bar', 'coffee', etc.
}
