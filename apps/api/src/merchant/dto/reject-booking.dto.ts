import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RejectBookingDto {
  @ApiProperty({ description: 'Reason for rejection' })
  @IsString()
  reason!: string;
}
