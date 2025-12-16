import { IsOptional, IsDateString, IsString } from 'class-validator';

export class ConfirmBookingDto {
  @IsOptional()
  @IsDateString()
  confirmedTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
