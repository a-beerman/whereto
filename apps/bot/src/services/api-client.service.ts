/**
 * API Client Service for the Telegram Bot
 * Uses the auto-generated typed Axios client from OpenAPI spec
 */
import {
  Configuration,
  CatalogApi,
  PlansApi,
  CitiesControllerFindAll200ResponseDataInner,
  VenuesControllerFindAllSortEnum,
  CreatePlanDto,
  CreatePlanDtoBudgetEnum,
  JoinPlanDto,
  VoteDto,
  ClosePlanDto,
  SaveVenueDto,
} from '@whereto/shared/api-client-axios';

// Re-export types for handlers
export type City = CitiesControllerFindAll200ResponseDataInner;
export type VenueSortOrder = VenuesControllerFindAllSortEnum;

export interface Venue {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  categories?: string[];
  rating?: number;
  ratingCount?: number;
  hours?: string[];
  distance?: number;
}

export class ApiClientService {
  private readonly catalogApi: CatalogApi;
  private readonly plansApi: PlansApi;

  constructor() {
    const baseUrl = process.env.API_URL || 'http://localhost:3000';

    const config = new Configuration({
      basePath: baseUrl,
      baseOptions: {
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Token': process.env.API_SERVICE_TOKEN || '',
        },
        timeout: 10000,
      },
    });

    this.catalogApi = new CatalogApi(config);
    this.plansApi = new PlansApi(config);
  }

  // ============ Cities ============

  /**
   * Get all available cities
   */
  async getCities(): Promise<{ data: City[] }> {
    const response = await this.catalogApi.citiesControllerFindAll();
    return { data: response.data.data || [] };
  }

  /**
   * Get city by ID
   */
  async getCity(cityId: string): Promise<{ data: City }> {
    const response = await this.catalogApi.citiesControllerFindOne(cityId);
    return { data: response.data.data as City };
  }

  // ============ Venues ============

  /**
   * Search venues with filters
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
    sort?: VenueSortOrder;
  }): Promise<{ data: Venue[]; meta?: { total?: number; hasMore?: boolean } }> {
    const response = await this.catalogApi.venuesControllerFindAll(
      params.q,
      params.cityId,
      params.category,
      params.lat,
      params.lng,
      params.radiusMeters,
      undefined, // bbox
      params.minRating,
      params.openNow,
      params.limit,
      params.offset,
      undefined, // cursor
      params.sort,
    );
    return {
      data: (response.data.data || []) as Venue[],
      meta: response.data.meta,
    };
  }

  /**
   * Get venue details by ID
   */
  async getVenue(venueId: string): Promise<{ data: Venue }> {
    const response = await this.catalogApi.venuesControllerFindOne(venueId);
    return { data: response.data.data as Venue };
  }

  // ============ Saved Venues ============

  /**
   * Get user's saved venues
   */
  async getSavedVenues(userId: string, limit = 20, offset = 0): Promise<{ data: Venue[] }> {
    const response = await this.catalogApi.userSavedVenuesControllerGetSavedVenues(
      offset,
      limit,
      userId,
    );
    return { data: (response.data.data || []) as Venue[] };
  }

  /**
   * Save a venue for user
   */
  async saveVenue(userId: string, venueId: string): Promise<{ success: boolean }> {
    const dto: SaveVenueDto = { venueId };
    await this.catalogApi.userSavedVenuesControllerSaveVenue(dto, userId);
    return { success: true };
  }

  /**
   * Remove saved venue for user
   */
  async removeSavedVenue(userId: string, venueId: string): Promise<{ success: boolean }> {
    await this.catalogApi.userSavedVenuesControllerRemoveSavedVenue(venueId, userId);
    return { success: true };
  }

  // ============ Plans ============

  /**
   * Create a new plan
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
  }): Promise<{ data: { id: string } }> {
    // Map budget string to enum
    let budgetEnum: CreatePlanDtoBudgetEnum | undefined;
    if (data.budget === '$') budgetEnum = CreatePlanDtoBudgetEnum.Dollar;
    else if (data.budget === '$$') budgetEnum = CreatePlanDtoBudgetEnum.DoubleDollar;
    else if (data.budget === '$$$') budgetEnum = CreatePlanDtoBudgetEnum.TripleDollar;

    const dto: CreatePlanDto = {
      telegramChatId: data.telegramChatId,
      initiatorId: data.initiatorId,
      date: data.date,
      time: data.time,
      area: data.area,
      cityId: data.cityId,
      locationLat: data.locationLat?.toString(),
      locationLng: data.locationLng?.toString(),
      budget: budgetEnum,
      format: data.format,
    };
    const response = await this.plansApi.plansControllerCreatePlan(dto);
    return { data: response.data.data as { id: string } };
  }

  /**
   * Join a plan
   */
  async joinPlan(
    planId: string,
    userId: string,
    preferences?: Record<string, unknown>,
    location?: { lat?: number; lng?: number },
  ): Promise<{ data: unknown }> {
    const dto: JoinPlanDto = {
      userId,
      preferences: preferences as JoinPlanDto['preferences'],
      locationLat: location?.lat?.toString(),
      locationLng: location?.lng?.toString(),
    };
    const response = await this.plansApi.plansControllerJoinPlan(planId, dto);
    return { data: response.data.data };
  }

  /**
   * Get plan shortlist/options
   */
  async getPlanOptions(planId: string): Promise<{ data: Venue[] }> {
    const response = await this.plansApi.plansControllerGetShortlist(planId);
    return { data: (response.data.data || []) as Venue[] };
  }

  /**
   * Start voting for a plan
   */
  async startVoting(planId: string): Promise<{ data: unknown }> {
    const response = await this.plansApi.plansControllerStartVoting(planId);
    return { data: response.data.data };
  }

  /**
   * Cast a vote
   */
  async castVote(planId: string, userId: string, venueId: string): Promise<{ data: unknown }> {
    const dto: VoteDto = { userId, venueId };
    const response = await this.plansApi.plansControllerCastVote(planId, dto);
    return { data: response.data.data };
  }

  /**
   * Close a plan
   */
  async closePlan(planId: string, initiatorId: string): Promise<{ data: unknown }> {
    const dto: ClosePlanDto = { initiatorId };
    const response = await this.plansApi.plansControllerClosePlan(planId, dto);
    return { data: response.data.data };
  }

  /**
   * Get plan details
   */
  async getPlan(planId: string): Promise<{ data: unknown }> {
    const response = await this.plansApi.plansControllerGetPlanDetails(planId);
    return { data: response.data.data };
  }
}
