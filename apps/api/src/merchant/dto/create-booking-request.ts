import { IsUUID, IsDateString, IsString, IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingRequest {
  @ApiProperty({ description: 'Venue ID (UUID)' })
  @IsUUID()
  venueId!: string;

  @ApiProperty({ description: 'Requested date (ISO date string)', example: '2024-01-15' })
  @IsDateString()
  requestedDate!: string;

  @ApiProperty({ description: 'Requested time', example: '19:00' })
  @IsString()
  requestedTime!: string;

  @ApiProperty({ description: 'Number of participants', minimum: 1 })
  @IsInt()
  participantsCount!: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
