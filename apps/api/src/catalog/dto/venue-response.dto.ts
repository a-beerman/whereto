export class VenueResponseDto {
  id!: string;
  cityId!: string;
  name!: string;
  address!: string;
  lat?: number;
  lng?: number;
  categories?: string[];
  rating?: number;
  ratingCount?: number;
  photoRefs?: string[];
  hours?: any;
  status!: 'active' | 'hidden' | 'duplicate';
  createdAt!: Date;
  updatedAt!: Date;
}
