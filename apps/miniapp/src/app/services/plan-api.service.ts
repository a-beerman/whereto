import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import {
  PlansService,
  CreatePlan,
  PlanDetailsData,
  StartVotingData,
  Vote,
  JoinPlan,
  ClosePlan,
  CreatePlanData,
  ClosePlanData,
  VenueResponse,
} from '@whereto/shared/api-client-angular';
import { ErrorHandlerService } from './error-handler.service';
import { Plan, VoteOption } from '../models/types';

/**
 * Centralized service for plan and voting API operations.
 * Wraps the generated PlansService and provides clean, business-logic-focused methods.
 *
 * This mirrors the bot's ApiService pattern: single source of truth for all plan-related calls,
 * with consistent error handling and response shape management.
 */
@Injectable({
  providedIn: 'root',
})
export class PlanApiService {
  private readonly plans = inject(PlansService);
  private readonly errorHandler = inject(ErrorHandlerService);

  /**
   * Create a new plan
   */
  createPlan(planData: CreatePlan): Observable<Plan> {
    return this.plans.plansCreatePlan(planData).pipe(
      map((response) => {
        const createPlanData: CreatePlanData = response.data;
        // Convert CreatePlanData to Plan (add missing fields)
        return {
          id: createPlanData.id,
          telegramChatId: planData.telegramChatId,
          initiatorId: createPlanData.initiatorId,
          date: createPlanData.date,
          time: createPlanData.time,
          cityId: planData.cityId || '',
          area: planData.area,
          budget: planData.budget,
          format: planData.format,
          status: createPlanData.status,
        } as Plan;
      }),
      catchError((error) => this.errorHandler.createCatchError('Ошибка создания плана')(error)),
    );
  }

  /**
   * Get plan details by ID
   */
  getPlanDetails(planId: string): Observable<PlanDetailsData> {
    return this.plans.plansGetPlanDetails(planId).pipe(
      map((response) => response.data),
      catchError((error) => this.errorHandler.createCatchError('Ошибка загрузки плана')(error)),
    );
  }

  /**
   * Join a plan
   */
  joinPlan(planId: string, userId: string): Observable<void> {
    const joinDto: JoinPlan = { userId };
    return this.plans.plansJoinPlan(planId, joinDto).pipe(
      map(() => undefined),
      catchError((error) =>
        this.errorHandler.createCatchError('Ошибка присоединения к плану')(error),
      ),
    );
  }

  /**
   * Start voting for a plan
   */
  startVoting(planId: string): Observable<StartVotingData> {
    return this.plans.plansStartVoting(planId).pipe(
      map((response) => response.data),
      catchError((error) =>
        this.errorHandler.createCatchError('Ошибка запуска голосования')(error),
      ),
    );
  }

  /**
   * Get shortlist of venue options for a plan (used when voting already started)
   */
  getShortlist(planId: string): Observable<{ venues: VenueResponse[] }> {
    return this.plans.plansGetShortlist(planId).pipe(
      map((response) => {
        // Convert ShortlistOption[] to VenueResponse[]
        const venues = response.data.map((option) => option.venue);
        return { venues };
      }),
      catchError((error) => this.errorHandler.createCatchError('Ошибка загрузки вариантов')(error)),
    );
  }

  /**
   * Cast a vote for a venue
   */
  castVote(planId: string, userId: string, venueId: string): Observable<void> {
    // Validate inputs - ensure venueId is a non-empty string
    if (!venueId || typeof venueId !== 'string' || venueId.trim() === '') {
      console.error('castVote: venueId is invalid', {
        planId,
        userId,
        venueId,
        type: typeof venueId,
      });
      return throwError(() => new Error('venueId must be a non-empty string'));
    }
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('castVote: userId is invalid', {
        planId,
        userId,
        venueId,
        type: typeof userId,
      });
      return throwError(() => new Error('userId must be a non-empty string'));
    }
    const voteDto: Vote = { userId, venueId };
    console.log('castVote: sending vote DTO', voteDto);
    return this.plans.plansCastVote(planId, voteDto).pipe(
      map(() => undefined),
      catchError((error) => {
        console.error('castVote: API error', error);
        return this.errorHandler.createCatchError('Ошибка при голосовании')(error);
      }),
    );
  }

  /**
   * Remove a vote
   */
  removeVote(planId: string, userId: string, venueId: string): Observable<void> {
    const voteDto: Vote = { userId, venueId };
    return this.plans.plansRemoveVote(planId, voteDto).pipe(
      map(() => undefined),
      catchError((error) =>
        this.errorHandler.createCatchError('Ошибка при удалении голоса')(error),
      ),
    );
  }

  /**
   * Get user's votes for a plan
   */
  getUserVotes(planId: string, userId: string): Observable<string[]> {
    return this.plans.plansGetUserVotes(planId, userId).pipe(
      map((response) => response.data || []),
      catchError((error) => this.errorHandler.createCatchError('Ошибка загрузки голосов')(error)),
    );
  }

  /**
   * Close a plan and get results
   * Note: The result component fetches plan details separately, so this returns a minimal structure
   */
  closePlan(planId: string, initiatorId: string): Observable<{ plan: Plan; winner?: VoteOption }> {
    const closeDto: ClosePlan = { initiatorId };
    return this.plans.plansClosePlan(planId, closeDto).pipe(
      // After closing, fetch the updated plan details to get winner info
      map(() => planId),
      switchMap((id) => this.plans.plansGetPlanDetails(id)),
      map((planResponse) => {
        const planData = planResponse.data;
        // Convert PlanDetailsData to Plan (minimal conversion since some fields aren't in PlanDetailsData)
        const plan: Plan = {
          id: planData.id,
          telegramChatId: '', // Not available in PlanDetailsData
          initiatorId: planData.initiatorId,
          date: planData.date,
          time: planData.time,
          cityId: '', // Not available in PlanDetailsData
          status: planData.status,
        };

        // Winner will be loaded by result component from plan details
        return { plan, winner: undefined };
      }),
      catchError((error) => this.errorHandler.createCatchError('Ошибка при закрытии плана')(error)),
    );
  }
}
