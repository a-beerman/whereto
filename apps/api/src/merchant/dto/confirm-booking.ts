import { IsOptional, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmBooking {
  @ApiPropertyOptional({ description: 'Confirmed time (ISO date-time string)' })
  @IsOptional()
  @IsDateString()
  confirmedTime?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
