import { Injectable, signal, computed } from '@angular/core';
import { BudgetLevel, FormatType } from '../models/types';

export interface PlanCreationState {
  step: 'date' | 'time' | 'area' | 'budget' | 'format' | 'complete';
  date?: string;
  time?: string;
  area?: string;
  budget?: BudgetLevel;
  format?: FormatType;
  cityId?: string;
  chatId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PlanStateService {
  // Signals for reactive state
  private stateSignal = signal<PlanCreationState>({
    step: 'date',
  });

  // Computed values
  state = computed(() => this.stateSignal());
  currentStep = computed(() => this.stateSignal().step);
  isComplete = computed(() => {
    const state = this.stateSignal();
    return !!(state.date && state.time && state.cityId);
  });

  /**
   * Initialize state with city and chat info
   */
  initialize(cityId: string, chatId?: string) {
    this.stateSignal.set({
      step: 'date',
      cityId,
      chatId,
    });
  }

  /**
   * Set date and move to time step
   */
  setDate(date: string) {
    this.stateSignal.update((state) => ({
      ...state,
      date,
      step: 'time',
    }));
  }

  /**
   * Set time and move to area step
   */
  setTime(time: string) {
    this.stateSignal.update((state) => ({
      ...state,
      time,
      step: 'area',
    }));
  }

  /**
   * Set area and move to budget step
   */
  setArea(area?: string) {
    this.stateSignal.update((state) => ({
      ...state,
      area,
      step: 'budget',
    }));
  }

  /**
   * Set budget and move to format step
   */
  setBudget(budget?: BudgetLevel) {
    this.stateSignal.update((state) => ({
      ...state,
      budget,
      step: 'format',
    }));
  }

  /**
   * Set format and mark as complete
   */
  setFormat(format?: FormatType) {
    this.stateSignal.update((state) => ({
      ...state,
      format,
      step: 'complete',
    }));
  }

  /**
   * Go back to previous step
   */
  goBack() {
    const currentStep = this.stateSignal().step;
    let previousStep: PlanCreationState['step'] = 'date';

    switch (currentStep) {
      case 'time':
        previousStep = 'date';
        break;
      case 'area':
        previousStep = 'time';
        break;
      case 'budget':
        previousStep = 'area';
        break;
      case 'format':
        previousStep = 'budget';
        break;
      case 'complete':
        previousStep = 'format';
        break;
    }

    this.stateSignal.update((state) => ({
      ...state,
      step: previousStep,
    }));
  }

  /**
   * Reset state
   */
  reset() {
    this.stateSignal.set({
      step: 'date',
    });
  }

  /**
   * Get current state as plain object
   */
  getCurrentState(): PlanCreationState {
    return this.stateSignal();
  }
}
