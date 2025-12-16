/**
 * Coordinates interface for location data
 * Matches GeoJSON Point format: [longitude, latitude]
 */
export interface Coordinates {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

/**
 * Helper to create Coordinates from lat/lng
 */
export function createCoordinates(lat: number, lng: number): Coordinates {
  return {
    type: 'Point',
    coordinates: [lng, lat], // GeoJSON format: [lng, lat]
  };
}

/**
 * Extract lat/lng from Coordinates
 */
export function extractLatLng(coords: Coordinates | null | undefined): {
  lat: number;
  lng: number;
} | null {
  if (!coords || !coords.coordinates || coords.coordinates.length !== 2) {
    return null;
  }
  return {
    lng: coords.coordinates[0],
    lat: coords.coordinates[1],
  };
}
