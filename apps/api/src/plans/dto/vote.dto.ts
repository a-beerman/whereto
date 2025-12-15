import { IsString, IsUUID } from 'class-validator';

export class VoteDto {
  @IsString()
  userId!: string; // Telegram user ID

  @IsUUID()
  venueId!: string;
}
