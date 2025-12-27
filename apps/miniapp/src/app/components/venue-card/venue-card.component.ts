import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import type { Venue } from '../../models/types';

@Component({
  selector: 'app-venue-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './venue-card.component.html',
  styleUrls: ['./venue-card.component.css'],
})
export class VenueCardComponent {
  @Input() venue!: Venue;
  @Input() showVoteIndicator = false;
  @Input() isVoted = false;
  @Input() voteCount?: number;
  @Input() votePercentage?: number;
  @Input() clickable = true;

  constructor(private readonly router: Router) {}

  onClick() {
    if (this.clickable && this.venue?.id) {
      this.router.navigate(['/venues', this.venue.id]);
    }
  }

  getPhotoUrl(): string | null {
    if (this.venue?.photoUrls && this.venue.photoUrls.length > 0) {
      return this.venue.photoUrls[0];
    }
    return null;
  }

  getRatingStars(): number[] {
    const rating = this.venue?.rating || 0;
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  isStarFilled(starIndex: number): boolean {
    const rating = this.venue?.rating || 0;
    return starIndex <= Math.floor(rating);
  }

  isStarHalf(starIndex: number): boolean {
    const rating = this.venue?.rating || 0;
    return starIndex > Math.floor(rating) && starIndex - 0.5 <= rating;
  }
}
