import { IsUUID } from 'class-validator';

export class SaveVenueDto {
  @IsUUID()
  venueId!: string;
}
