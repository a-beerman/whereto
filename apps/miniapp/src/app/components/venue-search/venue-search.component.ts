import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TelegramService } from '../../services/telegram.service';
import { CatalogApiService } from '../../services/catalog-api.service';
import { Venue } from '../../models/types';
import { VenueCardComponent } from '../venue-card/venue-card.component';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-venue-search',
  standalone: true,
  imports: [CommonModule, VenueCardComponent],
  templateUrl: './venue-search.component.html',
  styleUrls: ['./venue-search.component.css'],
})
export class VenueSearchComponent implements OnInit {
  private readonly telegram = inject(TelegramService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);
  venues = signal<Venue[]>([]);
  searchQuery = signal('');
  selectedCategory = signal<string | undefined>(undefined);
  selectedRating = signal<number | undefined>(undefined);
  useNearMe = signal(false);
  hasMore = signal(true);
  offset = signal(0);
  limit = 20;

  private searchSubject = new Subject<string>();

  // Available categories (could be fetched from API)
  categories = [
    { value: undefined, label: 'Все категории' },
    { value: 'restaurant', label: 'Ресторан' },
    { value: 'cafe', label: 'Кафе' },
    { value: 'bar', label: 'Бар' },
    { value: 'fast_food', label: 'Фастфуд' },
    { value: 'bakery', label: 'Пекарня' },
  ];

  // Rating options
  ratingOptions = [
    { value: undefined, label: 'Любой рейтинг' },
    { value: 4.5, label: '4.5+ ⭐' },
    { value: 4.0, label: '4.0+ ⭐' },
    { value: 3.5, label: '3.5+ ⭐' },
  ];

  ngOnInit() {
    // Setup search debounce
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe((query) => {
      this.searchQuery.set(query);
      this.performSearch();
    });

    // Load initial results
    this.performSearch();
  }

  onSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchSubject.next(target.value);
  }

  onCategoryChange(category: string | undefined) {
    this.selectedCategory.set(category);
    this.performSearch();
  }

  onRatingChange(value: string) {
    const rating = value ? parseFloat(value) : undefined;
    this.selectedRating.set(rating);
    this.performSearch();
  }

  onNearMeToggle() {
    this.useNearMe.set(!this.useNearMe());
    this.performSearch();
  }

  performSearch() {
    this.loading.set(true);
    this.error.set(null);
    this.offset.set(0);
    this.venues.set([]);

    const params: any = {
      q: this.searchQuery() || undefined,
      category: this.selectedCategory(),
      limit: this.limit,
      offset: 0,
    };

    // Add rating filter if selected
    if (this.selectedRating()) {
      params.minRating = this.selectedRating();
    }

    // Add location filter if "near me" is enabled
    if (this.useNearMe()) {
      // Try to get user location from Telegram
      // Note: Location is not available in standard Telegram WebApp API
      // This would require additional location permission handling
      // For now, we'll skip location-based search if not available
      this.telegram.showAlert(
        'Функция "Рядом со мной" требует доступа к геолокации. Пока используйте обычный поиск.',
      );
      this.useNearMe.set(false);
      this.loading.set(false);
      return;
    }

    this.catalogApi.searchVenues(params).subscribe({
      next: (results) => {
        this.venues.set(results);
        this.hasMore.set(results.length === this.limit);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error searching venues:', err);
        this.error.set('Ошибка поиска заведений');
        this.loading.set(false);
      },
    });
  }

  loadMore() {
    if (this.loading() || !this.hasMore()) return;

    const currentOffset = this.offset() + this.limit;
    this.offset.set(currentOffset);

    const params: any = {
      q: this.searchQuery() || undefined,
      category: this.selectedCategory(),
      limit: this.limit,
      offset: currentOffset,
    };

    if (this.selectedRating()) {
      params.minRating = this.selectedRating();
    }

    this.catalogApi.searchVenues(params).subscribe({
      next: (results) => {
        this.venues.update((current) => [...current, ...results]);
        this.hasMore.set(results.length === this.limit);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading more venues:', err);
        this.loading.set(false);
      },
    });
  }

  clearFilters() {
    this.searchQuery.set('');
    this.selectedCategory.set(undefined);
    this.selectedRating.set(undefined);
    this.useNearMe.set(false);
    this.performSearch();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchQuery() ||
      this.selectedCategory() ||
      this.selectedRating() ||
      this.useNearMe()
    );
  }
}
