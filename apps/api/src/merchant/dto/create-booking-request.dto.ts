import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsString, IsInt, IsOptional } from 'class-validator';

export class CreateBookingRequestDto {
  @ApiProperty({ description: 'ID of the venue to book' })
  @IsUUID()
  venueId!: string;

  @ApiProperty({ description: 'Requested date for the booking (YYYY-MM-DD)' })
  @IsDateString()
  requestedDate!: string;

  @ApiProperty({ description: 'Requested time for the booking (HH:mm)' })
  @IsString()
  requestedTime!: string;

  @ApiProperty({ description: 'Number of participants' })
  @IsInt()
  participantsCount!: number;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
