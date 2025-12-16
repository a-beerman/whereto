import { Context } from 'telegraf';
import { ApiClientService } from '../services/api-client.service';
import { StateService } from '../services/state.service';

export interface PlanCreationState {
  step: 'date' | 'time' | 'area' | 'budget' | 'format' | 'complete';
  date?: string;
  time?: string;
  area?: string;
  budget?: string;
  format?: string;
  cityId?: string;
}

export class PlanHandler {
  constructor(
    private readonly apiClient: ApiClientService,
    private readonly stateService: StateService,
  ) {}

  /**
   * Handle /plan command in group chat
   */
  async handlePlanCommand(ctx: Context) {
    try {
      // Check if in group chat
      if (!ctx.chat || ctx.chat.type === 'private') {
        await ctx.reply('Команда /plan работает только в групповых чатах.');
        return;
      }

      const userId = ctx.from?.id.toString() || '';
      const chatId = ctx.chat.id;

      // Get user's city
      const state = this.stateService.getUserState(userId);
      if (!state.cityId) {
        await ctx.reply('Сначала выберите город в личных сообщениях с ботом.');
        return;
      }

      // Initialize plan creation state
      const planState: PlanCreationState = {
        step: 'date',
        cityId: state.cityId,
      };

      // Store plan state (simplified - would use proper state management)
      (this.stateService as any).planStates = (this.stateService as any).planStates || new Map();
      (this.stateService as any).planStates.set(`${chatId}:${userId}`, planState);

      // Store that we're waiting for date input
      (this.stateService as any).waitingForPlanInput =
        (this.stateService as any).waitingForPlanInput || new Map();
      (this.stateService as any).waitingForPlanInput.set(`${chatId}:${userId}`, 'date');

      await ctx.reply(
        'Создаём план! Когда встречаемся? (формат: ДД.ММ.ГГГГ, например: 15.01.2024)',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Сегодня', callback_data: 'plan:date:today' }],
              [{ text: 'Завтра', callback_data: 'plan:date:tomorrow' }],
              [{ text: 'Отмена', callback_data: 'plan:cancel' }],
            ],
          },
        },
      );
    } catch (error) {
      console.error('Error in plan command:', error);
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  }

  /**
   * Handle plan date selection
   */
  async handleDateSelection(ctx: Context, date: string) {
    try {
      const userId = ctx.from?.id.toString() || '';
      const chatId = ctx.chat?.id;

      if (!chatId) return;

      const planState = this.getPlanState(chatId, userId);
      if (!planState) {
        await ctx.reply('Сессия создания плана истекла. Начните заново с /plan');
        return;
      }

      // Handle "today" and "tomorrow"
      let dateStr = date;
      if (date === 'today') {
        const today = new Date();
        dateStr = today.toISOString().split('T')[0];
      } else if (date === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateStr = tomorrow.toISOString().split('T')[0];
      }

      planState.date = dateStr;
      planState.step = 'time';

      this.savePlanState(chatId, userId, planState);

      // Mark that we're waiting for time input
      (this.stateService as any).waitingForPlanInput =
        (this.stateService as any).waitingForPlanInput || new Map();
      (this.stateService as any).waitingForPlanInput.set(`${chatId}:${userId}`, 'time');

      await ctx.reply('Во сколько встречаемся? (формат: ЧЧ:ММ, например: 19:00)', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '18:00', callback_data: 'plan:time:18:00' }],
            [{ text: '19:00', callback_data: 'plan:time:19:00' }],
            [{ text: '20:00', callback_data: 'plan:time:20:00' }],
            [{ text: 'Отмена', callback_data: 'plan:cancel' }],
          ],
        },
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in date selection:', error);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  /**
   * Handle plan time selection
   */
  async handleTimeSelection(ctx: Context, time: string) {
    try {
      const userId = ctx.from?.id.toString() || '';
      const chatId = ctx.chat?.id;

      if (!chatId) return;

      const planState = this.getPlanState(chatId, userId);
      if (!planState) {
        await ctx.reply('Сессия создания плана истекла. Начните заново с /plan');
        return;
      }

      planState.time = time;
      planState.step = 'area';

      this.savePlanState(chatId, userId, planState);

      await ctx.reply('Где встречаемся?', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📍 Центр города', callback_data: 'plan:area:city-center' }],
            [{ text: '📍 Середина между участниками', callback_data: 'plan:area:midpoint' }],
            [{ text: '📍 Указать место', callback_data: 'plan:area:custom' }],
            [{ text: 'Отмена', callback_data: 'plan:cancel' }],
          ],
        },
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in time selection:', error);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  /**
   * Handle plan area selection
   */
  async handleAreaSelection(ctx: Context, area: string) {
    try {
      const userId = ctx.from?.id.toString() || '';
      const chatId = ctx.chat?.id;

      if (!chatId) return;

      const planState = this.getPlanState(chatId, userId);
      if (!planState) {
        await ctx.reply('Сессия создания плана истекла. Начните заново с /plan');
        return;
      }

      planState.area = area;
      planState.step = 'budget';

      this.savePlanState(chatId, userId, planState);

      await ctx.reply('Какой бюджет?', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '$', callback_data: 'plan:budget:$' }],
            [{ text: '$$', callback_data: 'plan:budget:$$' }],
            [{ text: '$$$', callback_data: 'plan:budget:$$$' }],
            [{ text: 'Не важно', callback_data: 'plan:budget:any' }],
            [{ text: 'Отмена', callback_data: 'plan:cancel' }],
          ],
        },
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in area selection:', error);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  /**
   * Handle plan budget selection
   */
  async handleBudgetSelection(ctx: Context, budget: string) {
    try {
      const userId = ctx.from?.id.toString() || '';
      const chatId = ctx.chat?.id;

      if (!chatId) return;

      const planState = this.getPlanState(chatId, userId);
      if (!planState) {
        await ctx.reply('Сессия создания плана истекла. Начните заново с /plan');
        return;
      }

      planState.budget = budget === 'any' ? undefined : budget;
      planState.step = 'format';

      this.savePlanState(chatId, userId, planState);

      await ctx.reply('Какой формат?', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🍽️ Ужин', callback_data: 'plan:format:dinner' }],
            [{ text: '☕ Кофе', callback_data: 'plan:format:cafe' }],
            [{ text: '🍺 Бар', callback_data: 'plan:format:bar' }],
            [{ text: 'Не важно', callback_data: 'plan:format:any' }],
            [{ text: 'Отмена', callback_data: 'plan:cancel' }],
          ],
        },
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in budget selection:', error);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  /**
   * Handle plan format selection and create plan
   */
  async handleFormatSelection(ctx: Context, format: string) {
    try {
      const userId = ctx.from?.id.toString() || '';
      const chatId = ctx.chat?.id;

      if (!chatId) return;

      const planState = this.getPlanState(chatId, userId);
      if (!planState || !planState.date || !planState.time) {
        await ctx.reply('Сессия создания плана истекла. Начните заново с /plan');
        return;
      }

      planState.format = format === 'any' ? undefined : format;
      planState.step = 'complete';

      // Create plan via API
      const dateObj = this.parseDate(planState.date);
      if (!dateObj) {
        await ctx.reply('Неверный формат даты. Начните заново с /plan');
        return;
      }

      const planResponse = await this.apiClient.createPlan({
        telegramChatId: chatId.toString(),
        initiatorId: userId,
        date: dateObj.toISOString().split('T')[0],
        time: planState.time,
        area: planState.area,
        cityId: planState.cityId,
        budget: planState.budget,
        format: planState.format,
      });

      const plan = planResponse.data;

      // Clear plan state
      this.clearPlanState(chatId, userId);

      await ctx.reply(
        `✅ План создан!\n\n📅 ${planState.date} в ${planState.time}\n📍 ${planState.area || 'Не указано'}\n💰 ${planState.budget || 'Любой'}\n🍽️ ${planState.format || 'Любой'}\n\nНажми "Присоединиться", чтобы участвовать.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Присоединиться', callback_data: `plan:join:${plan.id}` }],
              [{ text: '📋 Показать варианты', callback_data: `plan:options:${plan.id}` }],
            ],
          },
        },
      );
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error creating plan:', error);
      await ctx.answerCbQuery('Ошибка при создании плана');
    }
  }

  /**
   * Handle join plan
   */
  async handleJoinPlan(ctx: Context, planId: string) {
    try {
      const userId = ctx.from?.id.toString() || '';

      await ctx.reply('Укажи свои предпочтения (или нажми "Пропустить"):', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🍽️ Формат', callback_data: `plan:pref:format:${planId}` }],
            [{ text: '💰 Бюджет', callback_data: `plan:pref:budget:${planId}` }],
            [{ text: '📍 Моё местоположение', callback_data: `plan:pref:location:${planId}` }],
            [{ text: '✅ Готово', callback_data: `plan:join:confirm:${planId}` }],
          ],
        },
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error joining plan:', error);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  /**
   * Confirm join plan
   */
  async handleJoinConfirm(ctx: Context, planId: string) {
    try {
      const userId = ctx.from?.id.toString() || '';

      await this.apiClient.joinPlan(planId, userId, {}, undefined);

      await ctx.reply('✅ Ты присоединился к плану!');
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error confirming join:', error);
      await ctx.answerCbQuery('Ошибка при присоединении');
    }
  }

  /**
   * Show plan options (shortlist)
   */
  async handleShowOptions(ctx: Context, planId: string) {
    try {
      // Start voting to generate shortlist
      const voteResponse = await this.apiClient.startVoting(planId);
      const voteData = voteResponse.data as {
        vote?: unknown;
        options?: Array<{
          venue: { name: string; rating?: number; address: string };
          venueId: string;
        }>;
      };
      const options = voteData?.options;

      if (!options || options.length === 0) {
        await ctx.reply('Варианты ещё не сгенерированы. Подождите немного.');
        return;
      }

      const optionsText = options
        .map((opt, index: number) => {
          const venue = opt.venue;
          return `${index + 1}. **${venue.name}**\n⭐ ${venue.rating || 'N/A'} · ${venue.address}`;
        })
        .join('\n\n');

      await ctx.reply(
        `📋 Варианты для голосования:\n\n${optionsText}\n\nГолосуй за понравившийся вариант!`,
        {
          reply_markup: {
            inline_keyboard: [
              ...options.map((opt, index: number) => [
                {
                  text: `${index + 1}. ${opt.venue.name}`,
                  callback_data: `plan:vote:${planId}:${opt.venueId}`,
                },
              ]),
              [{ text: '❌ Закрыть план', callback_data: `plan:close:${planId}` }],
            ],
          },
          parse_mode: 'Markdown',
        },
      );
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error showing options:', error);
      await ctx.answerCbQuery('Ошибка при загрузке вариантов');
    }
  }

  /**
   * Handle vote
   */
  async handleVote(ctx: Context, planId: string, venueId: string) {
    try {
      const userId = ctx.from?.id.toString() || '';

      await this.apiClient.castVote(planId, userId, venueId);

      await ctx.answerCbQuery('✅ Голос учтён!');
    } catch (error) {
      console.error('Error casting vote:', error);
      await ctx.answerCbQuery('Ошибка при голосовании');
    }
  }

  /**
   * Handle close plan
   */
  async handleClosePlan(ctx: Context, planId: string) {
    try {
      const userId = ctx.from?.id.toString() || '';

      const result = await this.apiClient.closePlan(planId, userId);
      const closeData = result.data as {
        plan?: unknown;
        winner?: {
          venue: { name: string; rating?: number; address: string };
          venueId: string;
          voteCount: number;
        };
      };
      const winner = closeData?.winner;

      if (!winner) {
        await ctx.reply('Не удалось определить победителя. Проверьте, что все проголосовали.');
        return;
      }

      const winnerText = `🏆 Победитель: **${winner.venue.name}**\n⭐ ${winner.venue.rating || 'N/A'}\n📍 ${winner.venue.address}\n\nГолосов: ${winner.voteCount}`;

      await ctx.reply(winnerText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📋 Запросить бронь',
                callback_data: `plan:book:${planId}:${winner.venueId}`,
              },
            ],
            [{ text: '📍 Маршрут', callback_data: `route:${winner.venueId}` }],
          ],
        },
        parse_mode: 'Markdown',
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error closing plan:', error);
      await ctx.answerCbQuery('Ошибка при закрытии плана');
    }
  }

  /**
   * Handle cancel plan creation
   */
  async handleCancel(ctx: Context) {
    try {
      const userId = ctx.from?.id.toString() || '';
      const chatId = ctx.chat?.id;

      if (chatId) {
        this.clearPlanState(chatId, userId);
      }

      await ctx.reply('Создание плана отменено.');
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error canceling plan:', error);
    }
  }

  // Helper methods
  private getPlanState(chatId: number, userId: string): PlanCreationState | null {
    const states = (this.stateService as any).planStates;
    if (!states) return null;
    return states.get(`${chatId}:${userId}`) || null;
  }

  private savePlanState(chatId: number, userId: string, state: PlanCreationState): void {
    if (!(this.stateService as any).planStates) {
      (this.stateService as any).planStates = new Map();
    }
    (this.stateService as any).planStates.set(`${chatId}:${userId}`, state);
  }

  private clearPlanState(chatId: number, userId: string): void {
    const states = (this.stateService as any).planStates;
    if (states) {
      states.delete(`${chatId}:${userId}`);
    }
  }

  private parseDate(dateStr: string): Date | null {
    // Handle "today", "tomorrow", or date string
    if (dateStr === 'today') {
      return new Date();
    }
    if (dateStr === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }

    // Try ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr);
    }

    // Parse DD.MM.YYYY format
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }

    return null;
  }
}
