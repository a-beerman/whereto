import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Vote {
  @ApiProperty({ description: 'Telegram user ID' })
  @IsString()
  userId!: string; // Telegram user ID

  @ApiProperty({ description: 'Venue ID (UUID)' })
  @IsUUID()
  venueId!: string;
}
