import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveVenue {
  @ApiProperty({ description: 'Venue ID (UUID)' })
  @IsUUID()
  venueId!: string;
}
