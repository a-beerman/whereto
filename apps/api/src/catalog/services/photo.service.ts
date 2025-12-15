import { Injectable } from '@nestjs/common';

@Injectable()
export class PhotoService {
  /**
   * Convert Google Places photo reference to URL
   * Format: https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference={photo_reference}&key={api_key}
   */
  getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      // Return placeholder or empty string if API key not configured
      return '';
    }

    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
  }

  /**
   * Convert array of photo references to URLs
   */
  getPhotoUrls(photoRefs: string[], maxWidth: number = 400): string[] {
    if (!photoRefs || photoRefs.length === 0) {
      return [];
    }

    return photoRefs.map((ref) => this.getPhotoUrl(ref, maxWidth));
  }
}
