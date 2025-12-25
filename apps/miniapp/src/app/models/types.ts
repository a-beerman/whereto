/**
 * Type definitions for the miniapp
 * These will be replaced with imports from @whereto/shared/api-client-angular once generated
 *
 * To generate the API client:
 * 1. Start the API: npm run dev:api
 * 2. Generate clients: npm run generate:api-client
 */

// For now, define minimal interfaces matching the API
// TODO: Replace with: import { ... } from '@whereto/shared/api-client-angular';

export interface Plan {
  id: string;
  telegramChatId: string;
  initiatorId: string;
  date: string;
  time: string;
  area?: string;
  cityId: string;
  budget?: string;
  format?: string;
  status?: string;
  winningVenueId?: string;
  participants?: Array<{ id: string; userId: string; joinedAt: string }>;
}

export interface CreatePlanDto {
  telegramChatId: string;
  initiatorId: string;
  date: string;
  time: string;
  area?: string;
  cityId: string;
  budget?: string;
  format?: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  rating?: number;
  ratingCount?: number;
  categories?: string[];
  location?: {
    type: string;
    coordinates: [number, number];
  };
  photoUrls?: string[];
  phone?: string;
  website?: string;
}

export interface VoteOption {
  venueId: string;
  venue: Venue;
  voteCount?: number;
}

export interface City {
  id: string;
  name: string;
}

export type BudgetLevel = '$' | '$$' | '$$$';
export type FormatType = 'dinner' | 'cafe' | 'bar';
