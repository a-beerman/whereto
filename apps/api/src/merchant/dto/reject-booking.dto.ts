import { IsString } from 'class-validator';

export class RejectBookingDto {
  @IsString()
  reason!: string;
}
