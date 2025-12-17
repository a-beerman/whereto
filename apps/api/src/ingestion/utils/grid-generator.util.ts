/**
 * Utility for generating search grid for large cities
 * Splits city bounds into multiple search areas to cover large cities like Moscow
 */

export interface CityBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface SearchArea {
  center: { lat: number; lng: number };
  radius: number; // in meters
}

/**
 * Calculate distance between two points in meters (Haversine formula)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate search grid for a city
 * @param bounds City bounds or center point
 * @param gridSize Number of cells per side (e.g., 5 = 5x5 = 25 cells)
 * @param radiusPerCell Radius for each cell in meters (default: 8000 = 8km)
 * @param overlapPercent Overlap between cells in percent (default: 20% to avoid missing venues on borders)
 */
export function generateSearchGrid(
  bounds: CityBounds | { centerLat: number; centerLng: number },
  gridSize: number = 5,
  radiusPerCell: number = 8000,
  overlapPercent: number = 20,
): SearchArea[] {
  let cityBounds: CityBounds;

  // If bounds provided, use them
  if ('minLat' in bounds) {
    cityBounds = bounds;
  } else {
    // If only center provided, create default bounds (50km radius)
    const defaultRadius = 50000; // 50km
    const latOffset = defaultRadius / 111000; // ~111km per degree latitude
    const lngOffset = defaultRadius / (111000 * Math.cos((bounds.centerLat * Math.PI) / 180));

    cityBounds = {
      minLat: bounds.centerLat - latOffset,
      minLng: bounds.centerLng - lngOffset,
      maxLat: bounds.centerLat + latOffset,
      maxLng: bounds.centerLng + lngOffset,
    };
  }

  const latRange = cityBounds.maxLat - cityBounds.minLat;
  const lngRange = cityBounds.maxLng - cityBounds.minLng;

  // Calculate cell size with overlap
  const overlapFactor = 1 - overlapPercent / 100;
  const cellLatSize = (latRange / gridSize) * overlapFactor;
  const cellLngSize = (lngRange / gridSize) * overlapFactor;

  // Calculate step size (with overlap)
  const latStep = latRange / gridSize;
  const lngStep = lngRange / gridSize;

  const searchAreas: SearchArea[] = [];

  // Generate grid cells
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      // Calculate cell center
      const cellCenterLat = cityBounds.minLat + (i + 0.5) * latStep;
      const cellCenterLng = cityBounds.minLng + (j + 0.5) * lngStep;

      // Calculate radius to cover cell + overlap
      // Use diagonal distance to ensure full coverage
      const cellDiagonal = Math.sqrt(cellLatSize ** 2 + cellLngSize ** 2) * 111000; // Convert to meters
      const radius = Math.max(radiusPerCell, cellDiagonal * 1.1); // Add 10% safety margin

      searchAreas.push({
        center: {
          lat: cellCenterLat,
          lng: cellCenterLng,
        },
        radius: Math.min(radius, 50000), // Google API max radius is 50km
      });
    }
  }

  return searchAreas;
}

/**
 * Determine optimal grid size based on city bounds
 * Larger cities get more cells
 */
export function calculateOptimalGridSize(bounds: CityBounds): number {
  // Calculate approximate city size in km
  const latDistance = calculateDistance(bounds.minLat, bounds.minLng, bounds.maxLat, bounds.minLng);
  const lngDistance = calculateDistance(bounds.minLat, bounds.minLng, bounds.minLat, bounds.maxLng);

  const maxDimension = Math.max(latDistance, lngDistance) / 1000; // Convert to km

  // Grid size based on city size:
  // Small city (< 20km): 3x3 = 9 cells
  // Medium city (20-40km): 5x5 = 25 cells
  // Large city (40-60km): 7x7 = 49 cells
  // Very large city (> 60km): 9x9 = 81 cells

  if (maxDimension < 20) {
    return 3;
  } else if (maxDimension < 40) {
    return 5;
  } else if (maxDimension < 60) {
    return 7;
  } else {
    return 9;
  }
}

/**
 * Parse city bounds from JSONB format
 * Supports multiple formats:
 * - { minLat, minLng, maxLat, maxLng }
 * - { north, south, east, west }
 * - { bounds: { minLat, ... } }
 */
export function parseCityBounds(bounds: any): CityBounds | null {
  if (!bounds) {
    return null;
  }

  // Format 1: { minLat, minLng, maxLat, maxLng }
  if (bounds.minLat !== undefined && bounds.minLng !== undefined) {
    return {
      minLat: parseFloat(bounds.minLat),
      minLng: parseFloat(bounds.minLng),
      maxLat: parseFloat(bounds.maxLat),
      maxLng: parseFloat(bounds.maxLng),
    };
  }

  // Format 2: { north, south, east, west }
  if (bounds.north !== undefined && bounds.south !== undefined) {
    return {
      minLat: parseFloat(bounds.south),
      minLng: parseFloat(bounds.west),
      maxLat: parseFloat(bounds.north),
      maxLng: parseFloat(bounds.east),
    };
  }

  // Format 3: { bounds: { ... } }
  if (bounds.bounds) {
    return parseCityBounds(bounds.bounds);
  }

  return null;
}
