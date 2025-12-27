import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from '../skeleton/skeleton.component';

@Component({
  selector: 'app-venue-card-skeleton',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="card">
      <!-- Photo skeleton -->
      <div class="w-full h-48 bg-telegram-secondaryBg overflow-hidden">
        <app-skeleton width="100%" height="100%" shape="rect"></app-skeleton>
      </div>

      <!-- Content skeleton -->
      <div class="p-4 space-y-3">
        <!-- Title -->
        <app-skeleton width="80%" height="24px" shape="rect"></app-skeleton>

        <!-- Rating -->
        <div class="flex items-center gap-2">
          <app-skeleton width="100px" height="20px" shape="rect"></app-skeleton>
        </div>

        <!-- Address -->
        <app-skeleton width="90%" height="16px" shape="rect"></app-skeleton>
        <app-skeleton width="60%" height="16px" shape="rect"></app-skeleton>

        <!-- Categories -->
        <div class="flex gap-2">
          <app-skeleton width="60px" height="24px" shape="rect" borderRadius="12px"></app-skeleton>
          <app-skeleton width="60px" height="24px" shape="rect" borderRadius="12px"></app-skeleton>
          <app-skeleton width="60px" height="24px" shape="rect" borderRadius="12px"></app-skeleton>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class VenueCardSkeletonComponent {}
