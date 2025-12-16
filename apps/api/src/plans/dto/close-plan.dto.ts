import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ClosePlanDto {
  @ApiProperty({ description: 'Telegram user ID of plan initiator' })
  @IsString()
  initiatorId!: string; // Telegram user ID of plan initiator
}
