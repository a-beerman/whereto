import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Plan, CreatePlanDto, Venue, VoteOption, City } from '../models/types';
import { TelegramService } from './telegram.service';

/**
 * API Service for the miniapp
 *
 * TODO: Once API client is generated, replace this with the generated Angular client:
 * import { CatalogApi, PlansApi } from '@whereto/shared/api-client-angular';
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly telegram = inject(TelegramService);

  // TODO: Use environment variable in production
  private readonly apiUrl = 'http://localhost:3000';

  private getHeaders(): HttpHeaders {
    const initData = this.telegram.getInitData();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': initData,
    });
  }

  // ============ Cities ============

  getCities(): Observable<City[]> {
    return this.http
      .get<{ data: City[] }>(`${this.apiUrl}/cities`, {
        headers: this.getHeaders(),
      })
      .pipe(map((res) => res.data || []));
  }

  // ============ Plans ============

  createPlan(planData: CreatePlanDto): Observable<Plan> {
    return this.http
      .post<{ data: Plan }>(`${this.apiUrl}/plans`, planData, {
        headers: this.getHeaders(),
      })
      .pipe(map((res) => res.data));
  }

  getPlan(planId: string): Observable<Plan> {
    return this.http
      .get<{ data: Plan }>(`${this.apiUrl}/plans/${planId}`, {
        headers: this.getHeaders(),
      })
      .pipe(map((res) => res.data));
  }

  joinPlan(planId: string, userId: string): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/plans/${planId}/join`,
      {
        userId,
      },
      { headers: this.getHeaders() },
    );
  }

  // ============ Voting ============

  startVoting(planId: string): Observable<{ options: VoteOption[] }> {
    return this.http
      .post<{
        data: { options: VoteOption[] };
      }>(`${this.apiUrl}/plans/${planId}/votes/start`, {}, { headers: this.getHeaders() })
      .pipe(map((res) => res.data));
  }

  getPlanOptions(planId: string): Observable<VoteOption[]> {
    return this.http
      .get<{
        data: VoteOption[];
      }>(`${this.apiUrl}/plans/${planId}/options`, { headers: this.getHeaders() })
      .pipe(map((res) => res.data || []));
  }

  castVote(planId: string, userId: string, venueId: string): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/plans/${planId}/votes`,
      { userId, venueId },
      { headers: this.getHeaders() },
    );
  }

  removeVote(planId: string, userId: string, venueId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/plans/${planId}/votes`, {
      headers: this.getHeaders(),
      body: { userId, venueId },
    });
  }

  getUserVotes(planId: string, userId: string): Observable<string[]> {
    return this.http
      .get<{
        data: string[];
      }>(`${this.apiUrl}/plans/${planId}/votes/user/${userId}`, { headers: this.getHeaders() })
      .pipe(map((res) => res.data || []));
  }

  closePlan(planId: string, userId: string): Observable<{ plan: Plan; winner?: VoteOption }> {
    return this.http
      .post<{
        data: { plan: Plan; winner?: VoteOption };
      }>(`${this.apiUrl}/plans/${planId}/close`, { userId }, { headers: this.getHeaders() })
      .pipe(map((res) => res.data));
  }

  // ============ Venues ============

  getVenue(venueId: string): Observable<Venue> {
    return this.http
      .get<{ data: Venue }>(`${this.apiUrl}/venues/${venueId}`, { headers: this.getHeaders() })
      .pipe(map((res) => res.data));
  }
}
