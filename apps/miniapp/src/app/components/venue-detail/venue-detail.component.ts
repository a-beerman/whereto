import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TelegramService } from '../../services/telegram.service';
import { CatalogApiService } from '../../services/catalog-api.service';
import { Venue } from '../../models/types';

@Component({
  selector: 'app-venue-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './venue-detail.component.html',
  styleUrls: ['./venue-detail.component.css'],
})
export class VenueDetailComponent implements OnInit {
  private readonly telegram = inject(TelegramService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  loading = signal(true);
  error = signal<string | null>(null);
  venue = signal<Venue | null>(null);
  currentPhotoIndex = signal(0);

  ngOnInit() {
    const venueId = this.route.snapshot.paramMap.get('id');

    if (!venueId) {
      this.error.set('Заведение не найдено');
      return;
    }

    this.catalogApi.getVenue(venueId).subscribe({
      next: (venue) => {
        // getVenue already returns a Venue type, so we can use it directly
        this.venue.set(venue);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading venue:', err);
        this.error.set('Ошибка загрузки заведения');
        this.loading.set(false);
      },
    });

    this.telegram.showBackButton(() => this.handleBack());
  }

  handleBack() {
    this.router.navigate(['..'], { relativeTo: this.route });
  }

  getPhotos(): string[] {
    return this.venue()?.photoUrls || [];
  }

  getCurrentPhoto(): string | null {
    const photos = this.getPhotos();
    if (photos.length === 0) return null;
    const index = this.currentPhotoIndex();
    return photos[index] || photos[0];
  }

  nextPhoto() {
    const photos = this.getPhotos();
    if (photos.length === 0) return;
    const current = this.currentPhotoIndex();
    this.currentPhotoIndex.set((current + 1) % photos.length);
  }

  previousPhoto() {
    const photos = this.getPhotos();
    if (photos.length === 0) return;
    const current = this.currentPhotoIndex();
    this.currentPhotoIndex.set((current - 1 + photos.length) % photos.length);
  }

  openInMaps() {
    const venue = this.venue();
    if (!venue) return;

    const coords = venue.location?.coordinates;
    if (coords && coords.length === 2) {
      const [lng, lat] = coords;
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    } else {
      const query = encodeURIComponent(`${venue.name} ${venue.address}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  }

  openDirections() {
    const venue = this.venue();
    if (!venue) return;

    const coords = venue.location?.coordinates;
    if (coords && coords.length === 2) {
      const [lng, lat] = coords;
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    } else {
      const query = encodeURIComponent(`${venue.name} ${venue.address}`);
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
    }
  }

  callPhone() {
    const phone = this.venue()?.phone;
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  }

  openWebsite() {
    const website = this.venue()?.website;
    if (website) {
      window.open(website, '_blank');
    }
  }

  formatHours(hours: any): string {
    if (!hours) return '';
    if (typeof hours === 'string') return hours;
    if (Array.isArray(hours)) {
      return hours.join('\n');
    }
    if (typeof hours === 'object') {
      // Try to format object hours
      if (hours.weekday_text) {
        return hours.weekday_text.join('\n');
      }
      return JSON.stringify(hours);
    }
    return '';
  }

  getRatingStars(): number[] {
    const rating = this.venue()?.rating || 0;
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  isStarFilled(starIndex: number): boolean {
    const rating = this.venue()?.rating || 0;
    return starIndex <= Math.floor(rating);
  }
}
