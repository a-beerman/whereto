import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TelegramService } from '../../services/telegram.service';
import { ApiService } from '../../services/api.service';
import { Plan, VoteOption } from '../../models/types';

@Component({
  selector: 'app-voting',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voting.component.html',
  styleUrls: ['./voting.component.css'],
})
export class VotingComponent implements OnInit, OnDestroy {
  private readonly telegram = inject(TelegramService);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  loading = signal(true);
  error = signal<string | null>(null);
  plan = signal<Plan | null>(null);
  venues = signal<VoteOption[]>([]);
  userVotes = signal<string[]>([]);
  isCreator = signal(false);

  ngOnInit() {
    const planId = this.route.snapshot.paramMap.get('id');
    const user = this.telegram.getUserInfo();

    if (!planId) {
      this.error.set('План не найден');
      return;
    }

    if (!user) {
      this.error.set('Не удалось получить информацию о пользователе');
      return;
    }

    this.api.getPlan(planId).subscribe({
      next: (plan) => {
        this.plan.set(plan);
        this.isCreator.set(plan.initiatorId === user.id.toString());
        this.startVoting(planId);
      },
      error: (err) => {
        console.error('Error loading plan:', err);
        this.error.set('Ошибка загрузки плана');
        this.loading.set(false);
      },
    });

    if (this.isCreator()) {
      this.telegram.showMainButton('Закрыть голосование', () => this.closePlan());
    }
  }

  ngOnDestroy() {
    this.telegram.hideMainButton();
  }

  private startVoting(planId: string) {
    this.api.startVoting(planId).subscribe({
      next: (result) => {
        this.venues.set(result.options || []);
        this.loadUserVotes(planId);
        this.loading.set(false);
      },
      error: (err) => {
        this.api.getPlanOptions(planId).subscribe({
          next: (options) => {
            this.venues.set(options);
            this.loadUserVotes(planId);
            this.loading.set(false);
          },
          error: () => {
            this.error.set('Ошибка загрузки вариантов');
            this.loading.set(false);
          },
        });
      },
    });
  }

  private loadUserVotes(planId: string) {
    const user = this.telegram.getUserInfo();
    if (!user) return;

    this.api.getUserVotes(planId, user.id.toString()).subscribe({
      next: (votes) => this.userVotes.set(votes),
      error: (err) => console.error('Error loading votes:', err),
    });
  }

  toggleVote(venueId: string) {
    const planId = this.plan()?.id;
    const user = this.telegram.getUserInfo();

    if (!planId || !user) return;

    const currentVotes = this.userVotes();
    const isVoted = currentVotes.includes(venueId);

    if (isVoted) {
      this.api.removeVote(planId, user.id.toString(), venueId).subscribe({
        next: () => this.userVotes.set(currentVotes.filter((v) => v !== venueId)),
        error: () => this.telegram.showAlert('Ошибка при удалении голоса'),
      });
    } else {
      this.api.castVote(planId, user.id.toString(), venueId).subscribe({
        next: () => this.userVotes.set([venueId]),
        error: (err) => {
          if (err.status === 403) {
            this.api.joinPlan(planId, user.id.toString()).subscribe({
              next: () => {
                this.api.castVote(planId, user.id.toString(), venueId).subscribe({
                  next: () => this.userVotes.set([venueId]),
                });
              },
            });
          }
        },
      });
    }
  }

  isVoted(venueId: string): boolean {
    return this.userVotes().includes(venueId);
  }

  closePlan() {
    const planId = this.plan()?.id;
    const user = this.telegram.getUserInfo();

    if (!planId || !user) return;

    this.telegram.showConfirm('Закрыть голосование?', (confirmed) => {
      if (!confirmed) return;

      this.loading.set(true);
      this.api.closePlan(planId, user.id.toString()).subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/result', planId]);
        },
        error: () => {
          this.loading.set(false);
          this.telegram.showAlert('Ошибка при закрытии голосования');
        },
      });
    });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const months = [
      'янв',
      'фев',
      'мар',
      'апр',
      'май',
      'июн',
      'июл',
      'авг',
      'сен',
      'окт',
      'ноя',
      'дек',
    ];

    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  }

  getVotePercentage(option: VoteOption): number {
    const totalVotes = this.venues().reduce((sum, v) => sum + (v.voteCount || 0), 0);
    if (totalVotes === 0) return 0;
    return Math.round(((option.voteCount || 0) / totalVotes) * 100);
  }
}
