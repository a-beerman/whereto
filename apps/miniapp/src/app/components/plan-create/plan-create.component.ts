import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TelegramService } from '../../services/telegram.service';
import { ApiService } from '../../services/api.service';
import { PlanStateService } from '../../services/plan-state.service';
import { CreatePlanDto } from '../../models/types';

@Component({
  selector: 'app-plan-create',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plan-create.component.html',
  styleUrls: ['./plan-create.component.css'],
})
export class PlanCreateComponent implements OnInit, OnDestroy {
  private readonly telegram = inject(TelegramService);
  private readonly api = inject(ApiService);
  private readonly planState = inject(PlanStateService);
  private readonly router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);

  state = this.planState.state;
  currentStep = this.planState.currentStep;

  dateOptions = [
    { value: 'today', label: 'Сегодня', icon: '📅' },
    { value: 'tomorrow', label: 'Завтра', icon: '📅' },
    { value: 'fri', label: 'Пятница', icon: '📅' },
    { value: 'sat', label: 'Суббота', icon: '📅' },
    { value: 'sun', label: 'Воскресенье', icon: '📅' },
  ];

  timeOptions = [
    { value: '12:00', label: '12:00', period: 'день' },
    { value: '14:00', label: '14:00', period: 'день' },
    { value: '18:00', label: '18:00', period: 'вечер' },
    { value: '19:00', label: '19:00', period: 'вечер' },
    { value: '20:00', label: '20:00', period: 'вечер' },
    { value: '21:00', label: '21:00', period: 'вечер' },
  ];

  areaOptions = [
    { value: 'center', label: 'Центр города', icon: '🏙️' },
    { value: undefined, label: 'Не важно', icon: '🗺️' },
  ];

  budgetOptions = [
    { value: '$' as const, label: '$', description: 'Эконом', icon: '💵' },
    { value: '$$' as const, label: '$$', description: 'Средний', icon: '💵💵' },
    { value: '$$$' as const, label: '$$$', description: 'Премиум', icon: '💵💵💵' },
    { value: undefined, label: 'Не важно', description: 'Любой', icon: '💰' },
  ];

  formatOptions = [
    { value: 'dinner' as const, label: 'Ужин', description: 'Ресторан', icon: '🍽️' },
    { value: 'cafe' as const, label: 'Кофе', description: 'Кафе', icon: '☕' },
    { value: 'bar' as const, label: 'Бар', description: 'Бар/Паб', icon: '🍺' },
    { value: undefined, label: 'Не важно', description: 'Любой', icon: '🍴' },
  ];

  ngOnInit() {
    const user = this.telegram.getUserInfo();
    const chatId = this.telegram.getChatId();

    if (!user) {
      this.error.set('Не удалось получить информацию о пользователе');
      return;
    }

    this.api.getCities().subscribe({
      next: (cities) => {
        if (cities.length > 0) {
          this.planState.initialize(cities[0].id, chatId);
        } else {
          this.error.set('Нет доступных городов');
        }
      },
      error: (err) => {
        console.error('Error loading cities:', err);
        this.error.set('Ошибка загрузки городов');
      },
    });

    if (this.currentStep() !== 'date') {
      this.telegram.showBackButton(() => this.handleBack());
    }
  }

  ngOnDestroy() {
    this.telegram.hideBackButton();
    this.telegram.hideMainButton();
  }

  handleBack() {
    this.planState.goBack();
    if (this.currentStep() === 'date') {
      this.telegram.hideBackButton();
    }
  }

  selectDate(dateValue: string) {
    const dateStr = this.resolveDateString(dateValue);
    this.planState.setDate(dateStr);
    this.telegram.showBackButton(() => this.handleBack());
  }

  selectTime(time: string) {
    this.planState.setTime(time);
  }

  selectArea(area?: string) {
    this.planState.setArea(area);
  }

  selectBudget(budget?: '$' | '$$' | '$$$') {
    this.planState.setBudget(budget);
  }

  selectFormat(format?: 'dinner' | 'cafe' | 'bar') {
    this.planState.setFormat(format);
    this.createPlan();
  }

  private createPlan() {
    const state = this.planState.getCurrentState();
    const user = this.telegram.getUserInfo();

    if (!user || !state.date || !state.time || !state.cityId) {
      this.error.set('Недостаточно данных для создания плана');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const planData: CreatePlanDto = {
      telegramChatId: state.chatId || user.id.toString(),
      initiatorId: user.id.toString(),
      date: state.date,
      time: state.time,
      cityId: state.cityId,
      area: state.area,
      budget: state.budget,
      format: state.format,
    };

    this.api.createPlan(planData).subscribe({
      next: (plan) => {
        this.loading.set(false);
        this.router.navigate(['/voting', plan.id]);
      },
      error: (err) => {
        console.error('Error creating plan:', err);
        this.loading.set(false);
        this.error.set('Ошибка создания плана. Попробуйте снова.');
      },
    });
  }

  private resolveDateString(date: string): string {
    const today = new Date();

    switch (date) {
      case 'today':
        return today.toISOString().split('T')[0];
      case 'tomorrow': {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      }
      case 'fri':
      case 'sat':
      case 'sun': {
        const dayMap: Record<string, number> = { fri: 5, sat: 6, sun: 0 };
        const targetDay = dayMap[date];
        const currentDay = today.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysUntil);
        return targetDate.toISOString().split('T')[0];
      }
      default:
        return date;
    }
  }

  getStepTitle(): string {
    switch (this.currentStep()) {
      case 'date':
        return 'Когда встречаемся?';
      case 'time':
        return 'Во сколько?';
      case 'area':
        return 'Где встречаемся?';
      case 'budget':
        return 'Какой бюджет?';
      case 'format':
        return 'Какой формат?';
      default:
        return 'Создание плана';
    }
  }

  getStepProgress(): number {
    const steps = ['date', 'time', 'area', 'budget', 'format'];
    const currentIndex = steps.indexOf(this.currentStep());
    return ((currentIndex + 1) / steps.length) * 100;
  }
}
