import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VenueResponse } from './venue-response';
import { Meta } from '../../common/dto/response';

export class CityCenter {
  @ApiProperty({ description: 'Latitude' })
  lat!: number;

  @ApiProperty({ description: 'Longitude' })
  lng!: number;
}

export class City {
  @ApiProperty({ description: 'City ID (UUID)' })
  id!: string;

  @ApiProperty({ description: 'City name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Country code' })
  countryCode?: string;

  @ApiPropertyOptional({ type: CityCenter })
  center?: CityCenter;

  @ApiPropertyOptional({ description: 'Timezone' })
  timezone?: string;

  @ApiPropertyOptional({ description: 'Whether city is active' })
  isActive?: boolean;
}

export class CitiesResponse {
  @ApiProperty({ type: [City] })
  data!: City[];
}

export class CityResponse {
  @ApiProperty({ type: City })
  data!: City;
}

export class VenuesResponse {
  @ApiProperty({ type: [VenueResponse] })
  data!: VenueResponse[];

  @ApiProperty({ type: Meta })
  meta!: Meta;
}

export class VenueDetailsResponse {
  @ApiProperty({ type: VenueResponse })
  data!: VenueResponse;
}
