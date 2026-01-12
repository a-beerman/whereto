/**
 * Product events schema for analytics
 * Track user journey: plan creation → voting → results
 */

export interface ProductEvent {
  eventType: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, unknown>;
}

/**
 * Bot events
 */
export enum BotEventType {
  BOT_SEARCH = 'bot_search',
  BOT_SEARCH_RESULT = 'bot_search_result',
  BOT_VENUE_VIEW = 'bot_venue_view',
  BOT_VENUE_SAVE = 'bot_venue_save',
  BOT_PLAN_CREATE_START = 'bot_plan_create_start',
  BOT_PLAN_CREATE_COMPLETE = 'bot_plan_create_complete',
  BOT_PLAN_VOTE = 'bot_plan_vote',
  BOT_PLAN_VOTE_REMOVE = 'bot_plan_vote_remove',
  BOT_PLAN_CLOSE = 'bot_plan_close',
}

/**
 * API events
 */
export enum ApiEventType {
  API_PLAN_CREATE = 'api_plan_create',
  API_PLAN_JOIN = 'api_plan_join',
  API_VOTE_START = 'api_vote_start',
  API_VOTE_CAST = 'api_vote_cast',
  API_VOTE_REMOVE = 'api_vote_remove',
  API_PLAN_CLOSE = 'api_plan_close',
  API_VENUE_SEARCH = 'api_venue_search',
  API_VENUE_DETAIL = 'api_venue_detail',
}

/**
 * Miniapp events
 */
export enum MiniappEventType {
  MINIAPP_OPEN = 'miniapp_open',
  MINIAPP_VOTE_PAGE_VIEW = 'miniapp_vote_page_view',
  MINIAPP_VOTE_CAST = 'miniapp_vote_cast',
  MINIAPP_CARD_VIEW = 'miniapp_card_view',
  MINIAPP_VENUE_SAVE = 'miniapp_venue_save',
  MINIAPP_VENUE_SHARE = 'miniapp_venue_share',
  MINIAPP_MAP_OPEN = 'miniapp_map_open',
}

/**
 * Event properties schemas
 */
export interface BotSearchProperties {
  query?: string;
  category?: string;
  cityId?: string;
  resultsCount: number;
}

export interface PlanCreateProperties {
  planId: string;
  chatId: string;
  format?: string;
  budget?: string;
  area?: string;
  date?: string;
  time?: string;
  [key: string]: unknown;
}

export interface VoteProperties {
  planId: string;
  venueId: string;
  userId: string;
  source: 'poll' | 'miniapp' | 'bot';
  [key: string]: unknown;
}

export interface CardViewProperties {
  venueId: string;
  source: 'search' | 'plan' | 'saved' | 'share';
}

/**
 * Helper to create consistent event structure
 */
export function createEvent(
  eventType: string,
  userId: string | undefined,
  properties?: Record<string, unknown>,
): ProductEvent {
  return {
    eventType,
    timestamp: new Date(),
    userId,
    properties,
  };
}

/**
 * Log event (placeholder - implement actual logging to DB/analytics)
 */
export function logEvent(event: ProductEvent): void {
  // TODO: Implement actual logging
  // Options:
  // 1. Store in Postgres events table
  // 2. Send to analytics service (Amplitude, Mixpanel, etc.)
  // 3. Send to data warehouse

  console.log('[ProductEvent]', JSON.stringify(event));
}
