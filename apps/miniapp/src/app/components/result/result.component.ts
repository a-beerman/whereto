import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TelegramService } from '../../services/telegram.service';
import { ApiService } from '../../services/api.service';
import { Plan, VoteOption } from '../../models/types';

@Component({
  selector: 'app-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './result.component.html',
  styleUrls: ['./result.component.css'],
})
export class ResultComponent implements OnInit {
  private readonly telegram = inject(TelegramService);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  loading = signal(true);
  error = signal<string | null>(null);
  plan = signal<Plan | null>(null);
  winner = signal<VoteOption | null>(null);

  ngOnInit() {
    const planId = this.route.snapshot.paramMap.get('id');

    if (!planId) {
      this.error.set('План не найден');
      return;
    }

    this.api.getPlan(planId).subscribe({
      next: (plan) => {
        this.plan.set(plan);

        if (plan.winningVenueId) {
          this.api.getVenue(plan.winningVenueId).subscribe({
            next: (venue) => {
              this.winner.set({ venueId: venue.id, venue });
              this.loading.set(false);
            },
            error: () => {
              this.error.set('Ошибка загрузки победителя');
              this.loading.set(false);
            },
          });
        } else {
          this.error.set('Победитель ещё не определён');
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

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const days = [
      'Воскресенье',
      'Понедельник',
      'Вторник',
      'Среда',
      'Четверг',
      'Пятница',
      'Суббота',
    ];
    const months = [
      'января',
      'февраля',
      'марта',
      'апреля',
      'мая',
      'июня',
      'июля',
      'августа',
      'сентября',
      'октября',
      'ноября',
      'декабря',
    ];

    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  }

  openInMaps() {
    const venue = this.winner()?.venue;
    if (!venue) return;

    const coords = venue.location?.coordinates;
    if (coords) {
      const [lng, lat] = coords;
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    } else {
      const query = encodeURIComponent(`${venue.name} ${venue.address}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  }

  shareLocation() {
    const venue = this.winner()?.venue;
    const plan = this.plan();

    if (!venue || !plan) return;

    const message = `🎉 Мы встречаемся!\n\n📍 ${venue.name}\n${venue.address}\n\n📅 ${this.formatDate(plan.date)}\n🕐 ${plan.time}`;

    if (navigator.share) {
      navigator.share({ title: 'План встречи', text: message });
    } else {
      navigator.clipboard.writeText(message).then(() => {
        this.telegram.showAlert('Информация скопирована в буфер обмена');
      });
    }
  }
}
