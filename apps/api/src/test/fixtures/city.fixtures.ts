import { City } from '../../catalog/entities/city.entity';

export function createTestCity(overrides?: Partial<City>): City {
  return {
    id: 'test-city-id',
    name: 'Kishinev',
    countryCode: 'MD',
    centerLat: 47.0104,
    centerLng: 28.8638,
    bounds: {
      northeast: { lat: 47.1, lng: 28.9 },
      southwest: { lat: 46.9, lng: 28.8 },
    },
    timezone: 'Europe/Chisinau',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as City;
}
