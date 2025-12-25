import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TelegramService } from '../../services/telegram.service';
import {
  PlansService,
  PlansControllerGetPlanDetails200ResponseData,
} from '@whereto/shared/api-client-angular';
import { VoteOption } from '../../models/types';

@Component({
  selector: 'app-voting',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voting.component.html',
  styleUrls: ['./voting.component.css'],
})
export class VotingComponent implements OnInit, OnDestroy {
  private readonly telegram = inject(TelegramService);
  private readonly plans = inject(PlansService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  loading = signal(true);
  error = signal<string | null>(null);
  plan = signal<PlansControllerGetPlanDetails200ResponseData | null>(null);
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

    this.plans.plansControllerGetPlanDetails(planId).subscribe({
      next: (response) => {
        const plan = response.data;
        if (plan) {
          this.plan.set(plan);
          this.isCreator.set(plan.initiatorId === user.id.toString());
          this.startVoting(planId);
        }
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
    this.plans.plansControllerStartVoting(planId).subscribe({
      next: (response) => {
        const result = response.data;
        // Map VenueResponseDto to VoteOption
        const options =
          result?.options?.map((venue) => ({
            venueId: venue.id || '',
            venue: venue as any,
          })) || [];
        this.venues.set(options);
        this.loadUserVotes(planId);
        this.loading.set(false);
      },
      error: (err) => {
        // If voting already started, we still need to load options from another endpoint
        // For now, just set error
        this.error.set('Ошибка загрузки вариантов');
        this.loading.set(false);
      },
    });
  }

  private loadUserVotes(planId: string) {
    const user = this.telegram.getUserInfo();
    if (!user) return;

    this.plans.plansControllerGetUserVotes(planId, user.id.toString()).subscribe({
      next: (response) => this.userVotes.set(response.data || []),
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
      this.plans
        .plansControllerRemoveVote(planId, { userId: user.id.toString(), venueId })
        .subscribe({
          next: () => this.userVotes.set(currentVotes.filter((v) => v !== venueId)),
          error: () => this.telegram.showAlert('Ошибка при удалении голоса'),
        });
    } else {
      this.plans
        .plansControllerCastVote(planId, { userId: user.id.toString(), venueId })
        .subscribe({
          next: () => this.userVotes.set([venueId]),
          error: (err) => {
            if (err.status === 403) {
              this.plans.plansControllerJoinPlan(planId, { userId: user.id.toString() }).subscribe({
                next: () => {
                  this.plans
                    .plansControllerCastVote(planId, { userId: user.id.toString(), venueId })
                    .subscribe({
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
      this.plans.plansControllerClosePlan(planId, { initiatorId: user.id.toString() }).subscribe({
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

  // Area is not present in the generated client type, so read it defensively.
  planArea(): string | null {
    const currentPlan = this.plan() as unknown as { area?: string } | null;
    return currentPlan?.area ?? null;
  }

  getVotePercentage(option: VoteOption): number {
    const totalVotes = this.venues().reduce((sum, v) => sum + (v.voteCount || 0), 0);
    if (totalVotes === 0) return 0;
    return Math.round(((option.voteCount || 0) / totalVotes) * 100);
  }
}
