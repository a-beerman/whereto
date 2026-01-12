import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectBooking {
  @ApiProperty({ description: 'Reason for rejection' })
  @IsString()
  reason!: string;
}
