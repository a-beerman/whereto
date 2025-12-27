import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TelegramService } from '../../services/telegram.service';
import { PlanApiService } from '../../services/plan-api.service';
import {
  PlansGetPlanDetails200ResponseData,
  VenueResponseDto,
} from '@whereto/shared/api-client-angular';
import { VoteOption, Venue } from '../../models/types';
import { VenueCardComponent } from '../venue-card/venue-card.component';

@Component({
  selector: 'app-voting',
  standalone: true,
  imports: [CommonModule, VenueCardComponent],
  templateUrl: './voting.component.html',
  styleUrls: ['./voting.component.css'],
})
export class VotingComponent implements OnInit, OnDestroy {
  private readonly telegram = inject(TelegramService);
  private readonly planApi = inject(PlanApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  loading = signal(true);
  error = signal<string | null>(null);
  plan = signal<PlansGetPlanDetails200ResponseData | null>(null);
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

    this.planApi.getPlanDetails(planId).subscribe({
      next: (plan) => {
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
    this.planApi.startVoting(planId).subscribe({
      next: (result) => {
        // Map VenueResponseDto to VoteOption with proper Venue format
        const options =
          result?.options?.map((venueDto: VenueResponseDto) => {
            const venue: Venue = {
              id: venueDto.id,
              name: venueDto.name,
              address: venueDto.address,
              rating: venueDto.rating,
              ratingCount: venueDto.ratingCount,
              categories: venueDto.categories,
              location:
                venueDto.lat && venueDto.lng
                  ? {
                      type: 'Point',
                      coordinates: [venueDto.lng, venueDto.lat] as [number, number],
                    }
                  : undefined,
              photoUrls: venueDto.photoUrls,
              phone: venueDto.phone,
              website: venueDto.website,
            };
            return {
              venueId: venue.id,
              venue,
              voteCount: 0, // Will be updated when votes are loaded
            };
          }) || [];
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

    this.planApi.getUserVotes(planId, user.id.toString()).subscribe({
      next: (votes) => this.userVotes.set(votes),
      error: (err) => console.error('Error loading votes:', err),
    });
  }

  toggleVote(venueId: string) {
    const planId = this.plan()?.id;
    const user = this.telegram.getUserInfo();

    if (!planId || !user) return;

    // Haptic feedback
    this.telegram.hapticFeedback('selection');

    const currentVotes = this.userVotes();
    const isVoted = currentVotes.includes(venueId);

    if (isVoted) {
      this.planApi.removeVote(planId, user.id.toString(), venueId).subscribe({
        next: () => {
          this.userVotes.set(currentVotes.filter((v) => v !== venueId));
          this.telegram.hapticFeedback('impact', 'light');
        },
        error: () => {
          this.telegram.showAlert('Ошибка при удалении голоса');
          this.telegram.hapticFeedback('notification', 'heavy');
        },
      });
    } else {
      this.planApi.castVote(planId, user.id.toString(), venueId).subscribe({
        next: () => {
          this.userVotes.set([venueId]);
          this.telegram.hapticFeedback('impact', 'medium');
        },
        error: (err) => {
          if (err.status === 403) {
            this.planApi.joinPlan(planId, user.id.toString()).subscribe({
              next: () => {
                this.planApi.castVote(planId, user.id.toString(), venueId).subscribe({
                  next: () => {
                    this.userVotes.set([venueId]);
                    this.telegram.hapticFeedback('impact', 'medium');
                  },
                });
              },
            });
          } else {
            const msg = (err && (err.message || err.error?.message)) || 'Ошибка при голосовании';
            this.telegram.showAlert(msg);
            this.telegram.hapticFeedback('notification', 'heavy');
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
      this.planApi.closePlan(planId, user.id.toString()).subscribe({
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
