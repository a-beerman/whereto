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
  photoRefs?: string[]; // Photo references (for backward compatibility)
  photoUrls?: string[]; // Photo URLs (converted from references)
  hours?: any; // Opening hours (formatted or raw)
  status!: 'active' | 'hidden' | 'duplicate';
  createdAt!: Date;
  updatedAt!: Date;
}
