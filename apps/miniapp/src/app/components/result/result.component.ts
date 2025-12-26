import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TelegramService } from '../../services/telegram.service';
import { PlanApiService } from '../../services/plan-api.service';
import { PlansControllerGetPlanDetails200ResponseData } from '@whereto/shared/api-client-angular';
import { VoteOption } from '../../models/types';

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
  private readonly route = inject(ActivatedRoute);
  private readonly datePipe = inject(DatePipe);

  loading = signal(true);
  error = signal<string | null>(null);
  plan = signal<PlansControllerGetPlanDetails200ResponseData | null>(null);
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
          // Note: The actual winner/venue info needs to be retrieved based on votes
          // since PlansControllerGetPlanDetails200ResponseData only has id, date, time, status, etc.
          this.loading.set(false);
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

    if (!venue || !plan || !plan.date) return;

    const formattedDate = this.datePipe.transform(plan.date, 'EEEE, d MMMM') ?? plan.date;
    const message = `🎉 Мы встречаемся!\n\n📍 ${venue.name}\n${venue.address}\n\n📅 ${formattedDate}\n🕐 ${plan.time || ''}`;

    if (navigator.share) {
      navigator.share({ title: 'План встречи', text: message });
    } else {
      navigator.clipboard.writeText(message).then(() => {
        this.telegram.showAlert('Информация скопирована в буфер обмена');
      });
    }
  }
}
