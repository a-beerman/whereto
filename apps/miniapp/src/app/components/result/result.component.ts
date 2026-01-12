import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TelegramService } from '../../services/telegram.service';
import { PlanApiService } from '../../services/plan-api.service';
import { CatalogApiService } from '../../services/catalog-api.service';
import { PlanDetailsData } from '@whereto/shared/api-client-angular';
import { VoteOption, Venue } from '../../models/types';

@Component({
  selector: 'app-result',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './result.component.html',
  styleUrls: ['./result.component.css'],
})
export class ResultComponent implements OnInit {
  private readonly telegram = inject(TelegramService);
  private readonly planApi = inject(PlanApiService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly datePipe = inject(DatePipe);

  loading = signal(true);
  error = signal<string | null>(null);
  plan = signal<PlanDetailsData | null>(null);
  winner = signal<VoteOption | null>(null);

  ngOnInit() {
    const planId = this.route.snapshot.paramMap.get('id');

    if (!planId) {
      this.error.set('План не найден');
      return;
    }

    this.planApi.getPlanDetails(planId).subscribe({
      next: (plan) => {
        if (plan) {
          this.plan.set(plan);
          // Check if plan has winningVenueId (may be present even if not in type)
          const planWithWinner = plan as any;
          if (planWithWinner.winningVenueId) {
            this.loadWinnerVenue(planWithWinner.winningVenueId);
          } else {
            // If no winner yet, check if plan is closed and try to get winner from votes
            if (plan.status === 'closed') {
              this.loadWinnerFromVotes(plan);
            } else {
              this.loading.set(false);
            }
          }
        } else {
          this.error.set('Ошибка загрузки плана');
          this.loading.set(false);
        }
      },
      error: () => {
        this.error.set('Ошибка загрузки плана');
        this.loading.set(false);
      },
    });

    this.telegram.showMainButton('Готово', () => this.telegram.close());
  }

  private loadWinnerVenue(venueId: string) {
    this.catalogApi.getVenue(venueId).subscribe({
      next: (venue) => {
        // getVenue already returns a Venue type, so we can use it directly
        this.winner.set({
          venueId: venue.id,
          venue: venue,
          voteCount: 0, // Vote count not available from plan details
        });
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading winner venue:', err);
        this.error.set('Ошибка загрузки информации о победителе');
        this.loading.set(false);
      },
    });
  }

  private loadWinnerFromVotes(plan: PlanDetailsData) {
    // If votes are available in the response, find the winner
    const planWithVotes = plan as any;
    if (
      planWithVotes.votes &&
      Array.isArray(planWithVotes.votes) &&
      planWithVotes.votes.length > 0
    ) {
      // Find the closed vote and get winner
      const closedVote = planWithVotes.votes.find(
        (v: any) => v.status === 'closed' && v.winnerVenueId,
      );
      if (closedVote?.winnerVenueId) {
        this.loadWinnerVenue(closedVote.winnerVenueId);
        return;
      }
    }
    // If we can't determine winner, just show plan without winner
    this.loading.set(false);
  }

  openInMaps() {
    const venue = this.winner()?.venue;
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
    const venue = this.winner()?.venue;
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

  addToCalendar() {
    const venue = this.winner()?.venue;
    const plan = this.plan();

    if (!venue || !plan || !plan.date || !plan.time) return;

    // Parse date and time
    const dateStr = plan.date;
    const timeStr = plan.time;
    const [hours, minutes] = timeStr.split(':').map(Number);

    const eventDate = new Date(dateStr);
    eventDate.setHours(hours, minutes, 0, 0);

    const endDate = new Date(eventDate);
    endDate.setHours(hours + 2, minutes, 0, 0); // Assume 2 hour event

    // Format dates for calendar
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const start = formatDate(eventDate);
    const end = formatDate(endDate);
    const title = encodeURIComponent(`Встреча: ${venue.name}`);
    const location = encodeURIComponent(`${venue.address}`);
    const description = encodeURIComponent(`Встреча в ${venue.name}\n${venue.address}`);

    // Google Calendar URL
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${description}&location=${location}`;

    window.open(calendarUrl, '_blank');
  }

  shareLocation() {
    const venue = this.winner()?.venue;
    const plan = this.plan();

    if (!venue || !plan || !plan.date) return;

    const formattedDate = this.datePipe.transform(plan.date, 'EEEE, d MMMM', 'ru') ?? plan.date;
    const message = `🎉 Мы встречаемся!\n\n📍 ${venue.name}\n${venue.address}\n\n📅 ${formattedDate}\n🕐 ${plan.time || ''}\n\n🗺️ Маршрут: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`;

    if (navigator.share) {
      navigator
        .share({
          title: 'План встречи',
          text: message,
        })
        .catch(() => {
          // Fallback to clipboard if share fails
          this.copyToClipboard(message);
        });
    } else {
      this.copyToClipboard(message);
    }
  }

  private copyToClipboard(text: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.telegram.showAlert('Информация скопирована в буфер обмена');
      })
      .catch(() => {
        this.telegram.showAlert('Не удалось скопировать информацию');
      });
  }
}
