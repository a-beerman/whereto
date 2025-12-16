import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsString } from 'class-validator';

export class ConfirmBookingDto {
  @ApiProperty({ description: 'Confirmed time for the booking', required: false })
  @IsOptional()
  @IsDateString()
  confirmedTime?: string;

  @ApiProperty({ description: 'Additional notes for the booking', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
