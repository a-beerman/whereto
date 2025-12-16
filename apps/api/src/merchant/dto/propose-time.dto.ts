import { IsDateString, IsString, IsOptional } from 'class-validator';

export class ProposeTimeDto {
  @IsDateString()
  proposedTime!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
