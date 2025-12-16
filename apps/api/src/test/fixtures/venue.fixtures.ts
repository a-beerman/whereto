import { Venue } from '../../catalog/entities/venue.entity';

export function createTestVenue(overrides?: Partial<Venue>): Venue {
  return {
    id: 'test-venue-id',
    cityId: 'test-city-id',
    name: 'Test Venue',
    address: '123 Test Street',
    location: {
      type: 'Point',
      coordinates: [28.8638, 47.0104], // Kishinev coordinates
    },
    categories: ['restaurant'],
    rating: 4.5,
    ratingCount: 100,
    photoRefs: ['photo-ref-1'],
    hours: {
      weekday_text: ['Monday: 9:00 AM – 10:00 PM'],
    },
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as Venue;
}

export function createTestVenues(count: number): Venue[] {
  return Array.from({ length: count }, (_, i) =>
    createTestVenue({
      id: `test-venue-${i}`,
      name: `Test Venue ${i}`,
    }),
  );
}
