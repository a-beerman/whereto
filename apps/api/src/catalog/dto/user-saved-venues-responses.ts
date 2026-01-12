import { ApiProperty } from '@nestjs/swagger';
import { VenueResponse } from './venue-response';
import { Meta } from '../../common/dto/response';

export class GetSavedVenuesResponse {
  @ApiProperty({ type: [VenueResponse] })
  data!: VenueResponse[];

  @ApiProperty({ type: Meta })
  meta!: Meta;
}

export class SaveVenueResponse {
  @ApiProperty({ description: 'Success message' })
  message!: string;
}

export class RemoveSavedVenueResponse {
  @ApiProperty({ description: 'Success message' })
  message!: string;
}
