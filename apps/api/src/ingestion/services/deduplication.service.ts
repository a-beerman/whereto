import { Injectable } from '@nestjs/common';
import { VenueRepository } from '../../catalog/repositories/venue.repository';
import { VenueSourceRepository } from '../../catalog/repositories/venue-source.repository';
import { Venue } from '../../catalog/entities/venue.entity';

@Injectable()
export class DeduplicationService {
  constructor(
    private readonly venueRepository: VenueRepository,
    private readonly venueSourceRepository: VenueSourceRepository,
  ) {}

  /**
   * Find existing venue by source ID (highest priority)
   */
  async findBySourceId(source: string, externalId: string): Promise<Venue | null> {
    const venueSource = await this.venueSourceRepository.findBySourceAndExternalId(
      source,
      externalId,
    );
    return venueSource?.venue || null;
  }

  /**
   * Find potential duplicates by geo + name similarity
   */
  async findPotentialDuplicates(
    name: string,
    lat: number,
    lng: number,
    thresholdMeters: number = 60,
  ): Promise<Venue[]> {
    // Search venues within threshold distance
    const searchResult = await this.venueRepository.search({
      lat,
      lng,
      radiusMeters: thresholdMeters,
      limit: 50,
    });

    // Filter by name similarity (simple normalized comparison)
    const normalizedName = this.normalizeName(name);
    const candidates: Venue[] = [];

    for (const venue of searchResult.venues) {
      const venueNormalizedName = this.normalizeName(venue.name);
      if (this.isNameSimilar(normalizedName, venueNormalizedName)) {
        candidates.push(venue);
      }
    }

    return candidates;
  }

  /**
   * Normalize name for comparison
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Check if two names are similar (simple heuristic)
   */
  private isNameSimilar(name1: string, name2: string, threshold: number = 0.8): boolean {
    // Simple Levenshtein-like comparison
    // For MVP, use substring matching
    const longer = name1.length > name2.length ? name1 : name2;
    const shorter = name1.length > name2.length ? name2 : name1;

    if (longer.includes(shorter) && shorter.length / longer.length >= threshold) {
      return true;
    }

    // Check word overlap
    const words1 = name1.split(' ');
    const words2 = name2.split(' ');
    const commonWords = words1.filter((w) => words2.includes(w) && w.length > 2);
    const similarity = commonWords.length / Math.max(words1.length, words2.length);

    return similarity >= threshold;
  }

  /**
   * Mark venue as duplicate
   */
  async markAsDuplicate(venueId: string): Promise<void> {
    await this.venueRepository.update(venueId, { status: 'duplicate' });
  }
}
