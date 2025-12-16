import { IsDateString, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProposeTimeDto {
  @ApiProperty({ description: 'Proposed time (ISO date-time string)' })
  @IsDateString()
  proposedTime!: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
