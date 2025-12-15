import { IsString } from 'class-validator';

export class ClosePlanDto {
  @IsString()
  initiatorId!: string; // Telegram user ID of plan initiator
}
