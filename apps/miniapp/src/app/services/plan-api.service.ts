import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  PlansService,
  CreatePlanDto,
  PlansControllerGetPlanDetails200ResponseData,
  PlansControllerStartVoting200ResponseData,
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
  createPlan(planData: CreatePlanDto): Observable<Plan> {
    return this.plans.plansControllerCreatePlan(planData).pipe(
      map((response) => response.data as Plan),
      catchError((error) => this.errorHandler.createCatchError('Ошибка создания плана')(error)),
    );
  }

  /**
   * Get plan details by ID
   */
  getPlanDetails(planId: string): Observable<PlansControllerGetPlanDetails200ResponseData> {
    return this.plans.plansControllerGetPlanDetails(planId).pipe(
      map((response) => response.data as PlansControllerGetPlanDetails200ResponseData),
      catchError((error) => this.errorHandler.createCatchError('Ошибка загрузки плана')(error)),
    );
  }

  /**
   * Join a plan
   */
  joinPlan(planId: string, userId: string): Observable<void> {
    return this.plans
      .plansControllerJoinPlan(planId, { userId })
      .pipe(
        catchError((error) =>
          this.errorHandler.createCatchError('Ошибка присоединения к плану')(error),
        ),
      );
  }

  /**
   * Start voting for a plan
   */
  startVoting(planId: string): Observable<PlansControllerStartVoting200ResponseData> {
    return this.plans.plansControllerStartVoting(planId).pipe(
      map((response) => response.data as PlansControllerStartVoting200ResponseData),
      catchError((error) =>
        this.errorHandler.createCatchError('Ошибка запуска голосования')(error),
      ),
    );
  }

  /**
   * Cast a vote for a venue
   */
  castVote(planId: string, userId: string, venueId: string): Observable<void> {
    return this.plans
      .plansControllerCastVote(planId, { userId, venueId })
      .pipe(
        catchError((error) => this.errorHandler.createCatchError('Ошибка при голосовании')(error)),
      );
  }

  /**
   * Remove a vote
   */
  removeVote(planId: string, userId: string, venueId: string): Observable<void> {
    return this.plans
      .plansControllerRemoveVote(planId, { userId, venueId })
      .pipe(
        catchError((error) =>
          this.errorHandler.createCatchError('Ошибка при удалении голоса')(error),
        ),
      );
  }

  /**
   * Get user's votes for a plan
   */
  getUserVotes(planId: string, userId: string): Observable<string[]> {
    return this.plans.plansControllerGetUserVotes(planId, userId).pipe(
      map((response) => response.data || []),
      catchError((error) => this.errorHandler.createCatchError('Ошибка загрузки голосов')(error)),
    );
  }

  /**
   * Close a plan and get results
   */
  closePlan(planId: string, initiatorId: string): Observable<{ plan: Plan; winner?: VoteOption }> {
    return this.plans.plansControllerClosePlan(planId, { initiatorId }).pipe(
      map((response) => response.data as { plan: Plan; winner?: VoteOption }),
      catchError((error) => this.errorHandler.createCatchError('Ошибка при закрытии плана')(error)),
    );
  }
}
