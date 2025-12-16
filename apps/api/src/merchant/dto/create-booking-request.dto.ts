import { IsUUID, IsDateString, IsString, IsInt, IsOptional } from 'class-validator';

export class CreateBookingRequestDto {
  @IsUUID()
  venueId!: string;

  @IsDateString()
  requestedDate!: string;

  @IsString()
  requestedTime!: string;

  @IsInt()
  participantsCount!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
