import { Injectable } from '@nestjs/common';
import { VenueRepository } from '../../catalog/repositories/venue.repository';
import { Plan } from '../entities/plan.entity';
import { Participant } from '../entities/participant.entity';
import { Venue } from '../../catalog/entities/venue.entity';

interface Point {
  lat: number;
  lng: number;
}

interface VenueScore {
  venue: Venue;
  distanceScore: number;
  ratingScore: number;
  preferenceScore: number;
  partnerBonus: number;
  totalScore: number;
}

@Injectable()
export class ShortlistService {
  constructor(private readonly venueRepository: VenueRepository) {}

  /**
   * Calculate meeting point from plan and participants
   */
  calculateMeetingPoint(plan: Plan, participants: Participant[]): Point {
    // Specific location provided
    if (plan.locationLat && plan.locationLng) {
      return { lat: plan.locationLat, lng: plan.locationLng };
    }

    // Calculate midpoint from participant locations
    if (plan.area === 'midpoint' && participants.length > 1) {
      const locations = participants
        .filter((p) => p.locationLat && p.locationLng)
        .map((p) => ({ lat: p.locationLat!, lng: p.locationLng! }));

      if (locations.length > 0) {
        const avgLat = locations.reduce((sum, l) => sum + l.lat, 0) / locations.length;
        const avgLng = locations.reduce((sum, l) => sum + l.lng, 0) / locations.length;
        return { lat: avgLat, lng: avgLng };
      }
    }

    // Fallback: use city center (would need city lookup)
    // For now, return a default point
    return { lat: 47.0104, lng: 28.8638 }; // Kishinev center
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(point1: Point, point2: Point): number {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLng = this.toRad(point2.lng - point1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.lat)) *
        Math.cos(this.toRad(point2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Extract lat/lng from venue location (PostGIS or native)
   */
  private getVenuePoint(venue: Venue): Point | null {
    if (venue.location) {
      if (typeof venue.location === 'object') {
        return {
          lat: venue.location.y || venue.location.lat || 0,
          lng: venue.location.x || venue.location.lng || 0,
        };
      }
    }
    // If using native lat/lng columns
    if ((venue as any).lat && (venue as any).lng) {
      return { lat: (venue as any).lat, lng: (venue as any).lng };
    }
    return null;
  }

  /**
   * Generate shortlist of 5 venues for a plan
   */
  async generateShortlist(
    plan: Plan,
    participants: Participant[],
  ): Promise<{ venues: Venue[]; meetingPoint: Point }> {
    const meetingPoint = this.calculateMeetingPoint(plan, participants);

    // Search venues in the area
    const radiusMeters = plan.area === 'city-center' ? 5000 : 10000;
    const searchResult = await this.venueRepository.search({
      cityId: plan.cityId || undefined,
      lat: meetingPoint.lat,
      lng: meetingPoint.lng,
      radiusMeters,
      category: plan.format,
      minRating: 3.5, // Minimum rating threshold
      limit: 50, // Get more candidates for scoring
    });

    // Score and rank venues
    const scored = this.scoreVenues(searchResult.venues, meetingPoint, plan, participants);

    // Sort by total score and take top 5
    const topVenues = scored
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5)
      .map((s) => s.venue);

    return { venues: topVenues, meetingPoint };
  }

  /**
   * Score venues based on distance, rating, preferences, and partner status
   */
  private scoreVenues(
    venues: Venue[],
    meetingPoint: Point,
    plan: Plan,
    participants: Participant[],
  ): VenueScore[] {
    return venues.map((venue) => {
      const venuePoint = this.getVenuePoint(venue);
      if (!venuePoint) {
        return {
          venue,
          distanceScore: 0,
          ratingScore: 0,
          preferenceScore: 0,
          partnerBonus: 0,
          totalScore: 0,
        };
      }

      const distance = this.calculateDistance(meetingPoint, venuePoint);
      const distanceScore = Math.max(0, 100 - distance / 50); // Max 100, decreases by 2 per 100m

      const ratingScore = venue.rating ? venue.rating * 20 : 0; // Max 100 (5.0 * 20)

      const preferenceScore = this.calculatePreferenceScore(venue, plan, participants);

      // Partner bonus (if venue has active partner)
      const partnerBonus = (venue as any).partners?.length > 0 ? 10 : 0;

      const totalScore =
        distanceScore * 0.3 + ratingScore * 0.4 + preferenceScore * 0.2 + partnerBonus * 0.1;

      return {
        venue,
        distanceScore,
        ratingScore,
        preferenceScore,
        partnerBonus,
        totalScore,
      };
    });
  }

  /**
   * Calculate preference match score
   */
  private calculatePreferenceScore(venue: Venue, plan: Plan, participants: Participant[]): number {
    let score = 50; // Base score

    // Budget match
    if (plan.budget && venue.categories) {
      // Simple heuristic: check if venue category matches budget expectations
      // This would need more sophisticated logic in production
    }

    // Format match
    if (plan.format && venue.categories?.includes(plan.format)) {
      score += 20;
    }

    // Participant preferences
    for (const participant of participants) {
      if (participant.preferences) {
        const prefs = participant.preferences;

        // Format preference
        if (prefs.format && venue.categories?.includes(prefs.format)) {
          score += 5;
        }

        // Budget preference
        if (prefs.budget && plan.budget === prefs.budget) {
          score += 3;
        }

        // Cuisine preference
        if (prefs.cuisine && venue.categories) {
          const matches = prefs.cuisine.filter((c) => venue.categories?.includes(c)).length;
          score += matches * 2;
        }
      }
    }

    return Math.min(100, score);
  }
}
