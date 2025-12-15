import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class ApiClientService {
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.API_URL || 'http://localhost:3000';
    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/v1`,
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add service token for authentication
        'X-Service-Token': process.env.API_SERVICE_TOKEN || '',
      },
      timeout: 10000,
    });
  }

  /**
   * Search venues
   */
  async searchVenues(params: {
    cityId?: string;
    q?: string;
    category?: string;
    lat?: number;
    lng?: number;
    radiusMeters?: number;
    minRating?: number;
    openNow?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const response = await this.client.get('/venues', { params });
    return response.data;
  }

  /**
   * Get venue details
   */
  async getVenue(venueId: string) {
    const response = await this.client.get(`/venues/${venueId}`);
    return response.data;
  }

  /**
   * Get cities
   */
  async getCities() {
    const response = await this.client.get('/cities');
    return response.data;
  }

  /**
   * Get city by ID
   */
  async getCity(cityId: string) {
    const response = await this.client.get(`/cities/${cityId}`);
    return response.data;
  }

  /**
   * Get saved venues for user
   */
  async getSavedVenues(userId: string, limit = 20, offset = 0) {
    const response = await this.client.get('/me/saved', {
      params: { limit, offset },
      headers: {
        'X-User-Id': userId,
      },
    });
    return response.data;
  }

  /**
   * Save venue for user
   */
  async saveVenue(userId: string, venueId: string) {
    const response = await this.client.post(
      '/me/saved',
      { venueId },
      {
        headers: {
          'X-User-Id': userId,
        },
      },
    );
    return response.data;
  }

  /**
   * Remove saved venue for user
   */
  async removeSavedVenue(userId: string, venueId: string) {
    const response = await this.client.delete(`/me/saved/${venueId}`, {
      headers: {
        'X-User-Id': userId,
      },
    });
    return response.data;
  }

  /**
   * Create plan
   */
  async createPlan(data: {
    telegramChatId: string;
    initiatorId: string;
    date: string;
    time: string;
    area?: string;
    cityId?: string;
    locationLat?: number;
    locationLng?: number;
    budget?: string;
    format?: string;
  }) {
    const response = await this.client.post('/plans', data);
    return response.data;
  }

  /**
   * Join plan
   */
  async joinPlan(
    planId: string,
    userId: string,
    preferences?: any,
    location?: { lat?: number; lng?: number },
  ) {
    const response = await this.client.post(`/plans/${planId}/join`, {
      userId,
      preferences,
      locationLat: location?.lat?.toString(),
      locationLng: location?.lng?.toString(),
    });
    return response.data;
  }

  /**
   * Get plan shortlist
   */
  async getPlanOptions(planId: string) {
    const response = await this.client.get(`/plans/${planId}/options`);
    return response.data;
  }

  /**
   * Start voting
   */
  async startVoting(planId: string) {
    const response = await this.client.post(`/plans/${planId}/vote`);
    return response.data;
  }

  /**
   * Cast vote
   */
  async castVote(planId: string, userId: string, venueId: string) {
    const response = await this.client.post(`/plans/${planId}/vote/cast`, {
      userId,
      venueId,
    });
    return response.data;
  }

  /**
   * Close plan
   */
  async closePlan(planId: string, initiatorId: string) {
    const response = await this.client.post(`/plans/${planId}/close`, {
      initiatorId,
    });
    return response.data;
  }

  /**
   * Get plan details
   */
  async getPlan(planId: string) {
    const response = await this.client.get(`/plans/${planId}`);
    return response.data;
  }
}
