import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, IsOptional } from 'class-validator';

export class ProposeTimeDto {
  @ApiProperty({ description: 'Proposed alternative time for the booking' })
  @IsDateString()
  proposedTime!: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
