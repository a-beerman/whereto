import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  PlansService,
  CreatePlanDto,
  PlansGetPlanDetails200ResponseData,
  PlansStartVoting200ResponseData,
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

  private isUuid(value: string | undefined): boolean {
    if (!value) return false;
    // Basic UUID v4 format validation (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      value,
    );
  }

  /**
   * Create a new plan
   */
  createPlan(planData: CreatePlanDto): Observable<Plan> {
    return this.plans.plansCreatePlan(planData).pipe(
      map((response) => response.data as Plan),
      catchError((error) => this.errorHandler.createCatchError('Ошибка создания плана')(error)),
    );
  }

  /**
   * Get plan details by ID
   */
  getPlanDetails(planId: string): Observable<PlansGetPlanDetails200ResponseData> {
    return this.plans.plansGetPlanDetails(planId).pipe(
      map((response) => response.data as PlansGetPlanDetails200ResponseData),
      catchError((error) => this.errorHandler.createCatchError('Ошибка загрузки плана')(error)),
    );
  }

  /**
   * Join a plan
   */
  joinPlan(planId: string, userId: string): Observable<void> {
    return this.plans.plansJoinPlan(planId, { userId }).pipe(
      map(() => undefined),
      catchError((error) =>
        this.errorHandler.createCatchError('Ошибка присоединения к плану')(error),
      ),
    );
  }

  /**
   * Start voting for a plan
   */
  startVoting(planId: string): Observable<PlansStartVoting200ResponseData> {
    return this.plans.plansStartVoting(planId).pipe(
      map((response) => response.data as PlansStartVoting200ResponseData),
      catchError((error) =>
        this.errorHandler.createCatchError('Ошибка запуска голосования')(error),
      ),
    );
  }

  /**
   * Cast a vote for a venue
   */
  castVote(planId: string, userId: string, venueId: string): Observable<void> {
    if (!this.isUuid(venueId)) {
      return this.errorHandler.handle(
        { status: 400, message: 'Некорректный идентификатор заведения' },
        'Некорректный идентификатор заведения',
      );
    }
    console.log('Casting vote payload', { planId, userId, venueId });
    return this.plans.plansCastVote(planId, { userId, venueId }).pipe(
      map(() => undefined),
      catchError((error) => this.errorHandler.createCatchError('Ошибка при голосовании')(error)),
    );
  }

  /**
   * Remove a vote
   */
  removeVote(planId: string, userId: string, venueId: string): Observable<void> {
    if (!this.isUuid(venueId)) {
      return this.errorHandler.handle(
        { status: 400, message: 'Некорректный идентификатор заведения' },
        'Некорректный идентификатор заведения',
      );
    }
    console.log('Removing vote payload', { planId, userId, venueId });
    return this.plans.plansRemoveVote(planId, { userId, venueId }).pipe(
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
   */
  closePlan(planId: string, initiatorId: string): Observable<{ plan: Plan; winner?: VoteOption }> {
    return this.plans.plansClosePlan(planId, { initiatorId }).pipe(
      map((response) => response.data as { plan: Plan; winner?: VoteOption }),
      catchError((error) => this.errorHandler.createCatchError('Ошибка при закрытии плана')(error)),
    );
  }
}
