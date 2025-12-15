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
}
