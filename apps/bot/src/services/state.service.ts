import { Venue } from './api-client.service';

export interface UserState {
  userId: string;
  cityId?: string;
  currentCategory?: string;
  searchQuery?: string;
  currentPage?: number;
  viewingVenueId?: string;
  venues?: Venue[];
}

export interface PlanCreationContext {
  sourceGroupId: number; // Which group the plan is for
  sourceGroupTitle?: string; // Group name for display
  step: 'date' | 'time' | 'area' | 'budget' | 'format' | 'complete';
  date?: string;
  time?: string;
  area?: string;
  budget?: string;
  format?: string;
  cityId?: string;
}

export interface PollContext {
  planId: string;
  venueIds: string[];
  groupChatId: number;
  creatorId: string;
}

export class StateService {
  private userStates: Map<string, UserState> = new Map();
  private planContexts: Map<string, PlanCreationContext> = new Map();
  private pollContexts: Map<string, PollContext> = new Map(); // pollId -> context

  // ============ User State Methods ============

  getUserState(userId: string): UserState {
    if (!this.userStates.has(userId)) {
      this.userStates.set(userId, { userId });
    }
    return this.userStates.get(userId)!;
  }

  updateUserState(userId: string, updates: Partial<UserState>): UserState {
    const state = this.getUserState(userId);
    Object.assign(state, updates);
    return state;
  }

  clearUserState(userId: string): void {
    this.userStates.delete(userId);
  }

  setCity(userId: string, cityId: string): void {
    this.updateUserState(userId, { cityId });
  }

  setCategory(userId: string, category: string): void {
    this.updateUserState(userId, { currentCategory: category, searchQuery: undefined });
  }

  setSearchQuery(userId: string, query: string): void {
    this.updateUserState(userId, { searchQuery: query, currentCategory: undefined });
  }

  // ============ Plan Creation Context Methods ============

  getPlanContext(userId: string): PlanCreationContext | undefined {
    return this.planContexts.get(userId);
  }

  setPlanContext(userId: string, context: PlanCreationContext): void {
    this.planContexts.set(userId, context);
  }

  updatePlanContext(
    userId: string,
    updates: Partial<PlanCreationContext>,
  ): PlanCreationContext | undefined {
    const context = this.planContexts.get(userId);
    if (context) {
      Object.assign(context, updates);
    }
    return context;
  }

  clearPlanContext(userId: string): void {
    this.planContexts.delete(userId);
  }

  // ============ Poll Context Methods ============

  getPollContext(pollId: string): PollContext | undefined {
    return this.pollContexts.get(pollId);
  }

  setPollContext(pollId: string, context: PollContext): void {
    this.pollContexts.set(pollId, context);
  }

  clearPollContext(pollId: string): void {
    this.pollContexts.delete(pollId);
  }

  // Find poll context by planId
  findPollContextByPlanId(planId: string): { pollId: string; context: PollContext } | undefined {
    for (const [pollId, context] of this.pollContexts.entries()) {
      if (context.planId === planId) {
        return { pollId, context };
      }
    }
    return undefined;
  }

  // Clear all poll contexts for a plan
  clearPollContextsByPlanId(planId: string): void {
    const pollIdsToDelete: string[] = [];
    for (const [pollId, context] of this.pollContexts.entries()) {
      if (context.planId === planId) {
        pollIdsToDelete.push(pollId);
      }
    }
    for (const pollId of pollIdsToDelete) {
      this.pollContexts.delete(pollId);
    }
  }
}
