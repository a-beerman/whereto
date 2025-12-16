export interface UserState {
  userId: string;
  cityId?: string;
  currentCategory?: string;
  searchQuery?: string;
  currentPage?: number;
  viewingVenueId?: string;
}

export class StateService {
  private userStates: Map<string, UserState> = new Map();

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
}
