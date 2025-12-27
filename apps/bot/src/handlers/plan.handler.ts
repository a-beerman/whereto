import { Context, Telegraf } from 'telegraf';
import { ApiClientService } from '../services/api-client.service';
import { StateService, PlanCreationContext, PollContext } from '../services/state.service';

export class PlanHandler {
  constructor(
    private readonly apiClient: ApiClientService,
    private readonly stateService: StateService,
  ) {}

  /**
   * Handle /plan command - redirect to DM for private plan creation
   */
  async handlePlanCommand(ctx: Context) {
    try {
      const userId = ctx.from?.id.toString() || '';
      const chatId = ctx.chat?.id;
      const chatType = ctx.chat?.type;

      if (!chatId || !userId) {
        await ctx.reply('Ошибка: не удалось определить чат или пользователя.');
        return;
      }

      // Get user's city
      let state = this.stateService.getUserState(userId);
      if (!state.cityId) {
        // Try to auto-select if only one city available
        const cityId = await this.ensureCitySelected(userId);
        if (!cityId) {
          await ctx.reply('Сначала выберите город. Напишите мне в личные сообщения /start');
          return;
        }
        // Refresh state after auto-selection
        state = this.stateService.getUserState(userId);
      }

      // If already in private chat, start plan creation directly
      if (chatType === 'private') {
        // Check if there's a pending plan context from a group
        const existingContext = this.stateService.getPlanContext(userId);
        if (existingContext) {
          // Continue with existing context
          await this.sendDateSelection(ctx);
        } else {
          // Creating plan from private chat (no group)
          this.stateService.setPlanContext(userId, {
            sourceGroupId: chatId, // Will be same as private chat
            step: 'date',
            cityId: state.cityId,
          });
          await this.sendDateSelection(ctx);
        }
        return;
      }

      // In group chat - store context and send message to user's PM
      const groupTitle =
        ctx.chat && 'title' in ctx.chat ? (ctx.chat as { title?: string }).title : 'группа';

      this.stateService.setPlanContext(userId, {
        sourceGroupId: chatId,
        sourceGroupTitle: groupTitle,
        step: 'date',
        cityId: state.cityId,
      });

      // Get bot info for DM link
      const botInfo = ctx.botInfo;
      const botUsername = botInfo?.username || 'WhereTo_City_Bot';
      const userName = ctx.from?.first_name || ctx.from?.username || 'Кто-то';

      // Send informative message to group
      await ctx.reply(
        `🎉 ${userName} создаёт новый план встречи!\n\nПроверьте личные сообщения для продолжения.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📝 Создать свой план',
                  url: `https://t.me/${botUsername}?start=plan_${chatId}`,
                },
              ],
            ],
          },
        },
      );

      // Try to send message directly to user's PM
      try {
        await ctx.telegram.sendMessage(
          parseInt(userId, 10),
          `Создаём план для "${groupTitle}".\n\nНажмите кнопку ниже, чтобы начать:`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '📝 Начать создание плана',
                    url: `https://t.me/${botUsername}?start=plan_${chatId}`,
                  },
                ],
              ],
            },
          },
        );
      } catch (pmError) {
        // If bot can't send PM (user hasn't started bot), the group message already has the link
        console.log('Could not send PM to user:', pmError);
      }
    } catch (error) {
      console.error('Error in plan command:', error);
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  }

  /**
   * Handle /start with plan parameter (from group redirect)
   */
  async handleStartWithPlan(ctx: Context, groupChatId: string) {
    try {
      const userId = ctx.from?.id.toString() || '';

      // Check if we have context
      let planContext = this.stateService.getPlanContext(userId);

      if (!planContext) {
        // Context might have expired, create a new one
        let state = this.stateService.getUserState(userId);
        if (!state.cityId) {
          // Try to auto-select if only one city available
          const cityId = await this.ensureCitySelected(userId);
          if (!cityId) {
            await ctx.reply('Сначала выберите город с помощью /start');
            return;
          }
          // Refresh state after auto-selection
          state = this.stateService.getUserState(userId);
        }

        this.stateService.setPlanContext(userId, {
          sourceGroupId: parseInt(groupChatId, 10),
          step: 'date',
          cityId: state.cityId,
        });
        planContext = this.stateService.getPlanContext(userId)!;
      }

      const groupName = planContext.sourceGroupTitle || 'группа';
      await ctx.reply(`Создаём план для "${groupName}".\n\nКогда встречаемся?`);
      await this.sendDateSelection(ctx);
    } catch (error) {
      console.error('Error in start with plan:', error);
      await ctx.reply('Произошла ошибка. Попробуйте /plan в группе снова.');
    }
  }

  /**
   * Send date selection options
   */
  private async sendDateSelection(ctx: Context) {
    await ctx.reply('Выбери дату:', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Сегодня', callback_data: 'plan:date:today' },
            { text: 'Завтра', callback_data: 'plan:date:tomorrow' },
          ],
          [
            { text: 'Пт', callback_data: 'plan:date:fri' },
            { text: 'Сб', callback_data: 'plan:date:sat' },
            { text: 'Вс', callback_data: 'plan:date:sun' },
          ],
          [{ text: '❌ Отмена', callback_data: 'plan:cancel' }],
        ],
      },
    });
  }

  /**
   * Handle plan date selection (in DM)
   */
  async handleDateSelection(ctx: Context, date: string) {
    try {
      const userId = ctx.from?.id.toString() || '';

      const planContext = this.stateService.getPlanContext(userId);
      if (!planContext) {
        await ctx.reply('Сессия создания плана истекла. Начните заново с /plan в группе.');
        return;
      }

      // Parse date
      const dateStr = this.resolveDateString(date);
      this.stateService.updatePlanContext(userId, { date: dateStr, step: 'time' });

      await ctx.reply('Во сколько встречаемся?', {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '12:00', callback_data: 'plan:time:12:00' },
              { text: '14:00', callback_data: 'plan:time:14:00' },
            ],
            [
              { text: '18:00', callback_data: 'plan:time:18:00' },
              { text: '19:00', callback_data: 'plan:time:19:00' },
            ],
            [
              { text: '20:00', callback_data: 'plan:time:20:00' },
              { text: '21:00', callback_data: 'plan:time:21:00' },
            ],
            [{ text: '❌ Отмена', callback_data: 'plan:cancel' }],
          ],
        },
      });
      await ctx.answerCbQuery?.();
    } catch (error) {
      console.error('Error in date selection:', error);
      await ctx.answerCbQuery?.('Ошибка');
    }
  }

  /**
   * Handle plan time selection (in DM)
   */
  async handleTimeSelection(ctx: Context, time: string) {
    try {
      const userId = ctx.from?.id.toString() || '';

      const planContext = this.stateService.getPlanContext(userId);
      if (!planContext) {
        await ctx.reply('Сессия создания плана истекла. Начните заново с /plan в группе.');
        return;
      }

      this.stateService.updatePlanContext(userId, { time, step: 'area' });

      await ctx.reply('Где встречаемся?', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📍 Центр города', callback_data: 'plan:area:center' }],
            [{ text: '📍 Не важно', callback_data: 'plan:area:any' }],
            [{ text: '❌ Отмена', callback_data: 'plan:cancel' }],
          ],
        },
      });
      await ctx.answerCbQuery?.();
    } catch (error) {
      console.error('Error in time selection:', error);
      await ctx.answerCbQuery?.('Ошибка');
    }
  }

  /**
   * Handle plan area selection (in DM)
   */
  async handleAreaSelection(ctx: Context, area: string) {
    try {
      const userId = ctx.from?.id.toString() || '';

      const planContext = this.stateService.getPlanContext(userId);
      if (!planContext) {
        await ctx.reply('Сессия создания плана истекла. Начните заново с /plan в группе.');
        return;
      }

      this.stateService.updatePlanContext(userId, {
        area: area === 'any' ? undefined : area,
        step: 'budget',
      });

      await ctx.reply('Какой бюджет?', {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '$', callback_data: 'plan:budget:$' },
              { text: '$$', callback_data: 'plan:budget:$$' },
              { text: '$$$', callback_data: 'plan:budget:$$$' },
            ],
            [{ text: 'Не важно', callback_data: 'plan:budget:any' }],
            [{ text: '❌ Отмена', callback_data: 'plan:cancel' }],
          ],
        },
      });
      await ctx.answerCbQuery?.();
    } catch (error) {
      console.error('Error in area selection:', error);
      await ctx.answerCbQuery?.('Ошибка');
    }
  }

  /**
   * Handle plan budget selection (in DM)
   */
  async handleBudgetSelection(ctx: Context, budget: string) {
    try {
      const userId = ctx.from?.id.toString() || '';

      const planContext = this.stateService.getPlanContext(userId);
      if (!planContext) {
        await ctx.reply('Сессия создания плана истекла. Начните заново с /plan в группе.');
        return;
      }

      this.stateService.updatePlanContext(userId, {
        budget: budget === 'any' ? undefined : budget,
        step: 'format',
      });

      await ctx.reply('Какой формат?', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🍽️ Ужин', callback_data: 'plan:format:dinner' }],
            [{ text: '☕ Кофе', callback_data: 'plan:format:cafe' }],
            [{ text: '🍺 Бар', callback_data: 'plan:format:bar' }],
            [{ text: 'Не важно', callback_data: 'plan:format:any' }],
            [{ text: '❌ Отмена', callback_data: 'plan:cancel' }],
          ],
        },
      });
      await ctx.answerCbQuery?.();
    } catch (error) {
      console.error('Error in budget selection:', error);
      await ctx.answerCbQuery?.('Ошибка');
    }
  }

  /**
   * Handle plan format selection and create plan (in DM), then post to group
   */
  async handleFormatSelection(ctx: Context, format: string, bot: Telegraf) {
    try {
      const userId = ctx.from?.id.toString() || '';
      const userName = ctx.from?.first_name || 'Участник';

      const planContext = this.stateService.getPlanContext(userId);
      if (!planContext || !planContext.date || !planContext.time) {
        await ctx.reply('Сессия создания плана истекла. Начните заново с /plan в группе.');
        return;
      }

      this.stateService.updatePlanContext(userId, {
        format: format === 'any' ? undefined : format,
        step: 'complete',
      });

      // Create plan via API
      const dateObj = this.parseDate(planContext.date);
      if (!dateObj) {
        await ctx.reply('Неверный формат даты. Начните заново.');
        return;
      }

      const planResponse = await this.apiClient.createPlan({
        telegramChatId: planContext.sourceGroupId.toString(),
        initiatorId: userId,
        date: dateObj.toISOString().split('T')[0],
        time: planContext.time,
        area: planContext.area,
        cityId: planContext.cityId,
        budget: planContext.budget,
        format: planContext.format,
      });

      const plan = planResponse.data;

      // Format date for display
      const dateDisplay = this.formatDateDisplay(planContext.date);

      // Build announcement text with only selected parameters
      const announcementParts: string[] = [`🎉 ${userName} создал план!`];

      // Add date/time
      announcementParts.push(`📅 ${dateDisplay} в ${planContext.time}`);

      // Add area only if not "не важно"
      if (planContext.area && planContext.area !== 'any' && planContext.area !== 'не важно') {
        const areaDisplay = this.formatAreaDisplay(planContext.area);
        announcementParts.push(`📍 ${areaDisplay}`);
      }

      // Add budget only if not "любой"
      if (planContext.budget && planContext.budget !== 'any' && planContext.budget !== 'любой') {
        const budgetDisplay = this.formatBudgetDisplay(planContext.budget);
        announcementParts.push(`💰 ${budgetDisplay}`);
      }

      // Add format only if not "любой"
      if (planContext.format && planContext.format !== 'any' && planContext.format !== 'любой') {
        const formatDisplay = this.formatFormatDisplay(planContext.format);
        announcementParts.push(`🍽️ ${formatDisplay}`);
      }

      // Confirm to user in DM
      await ctx.reply(
        `✅ План создан!\n\n${announcementParts.join('\n')}\n\nОтправляю опрос в группу...`,
      );

      // Start voting to get shortlist
      const groupChatId = planContext.sourceGroupId;
      let venues: Array<{ id: string; name: string; rating?: number; address: string }> = [];

      try {
        // Start voting to generate shortlist
        const voteResponse = await this.apiClient.startVoting(plan.id);
        const voteData = voteResponse.data as {
          vote?: unknown;
          options?: Array<{
            venue: { name: string; rating?: number; address: string };
            venueId: string;
          }>;
        };

        if (voteData?.options && Array.isArray(voteData.options)) {
          venues = voteData.options
            .filter((o) => o && o.venue && (o.venue.name || o.venueId) && o.venueId)
            .map((o) => ({
              id: o.venueId,
              name: o.venue?.name || 'Без названия',
              rating: o.venue?.rating,
              address: o.venue?.address || '',
            }));
        }
      } catch (voteError) {
        console.error('Error starting voting:', voteError);
        // If voting fails, try to get shortlist directly
        try {
          const shortlistResponse = await this.apiClient.getPlanOptions(plan.id);
          if (shortlistResponse.data && Array.isArray(shortlistResponse.data)) {
            venues = (shortlistResponse.data as any[])
              .filter((item: any) => {
                const venue = item.venue || item;
                return venue && (venue.id || item.venueId) && venue.name;
              })
              .map((item: any) => {
                const venue = item.venue || item;
                return {
                  id: item.venueId || venue.id || '',
                  name: venue.name || 'Без названия',
                  rating: venue.rating,
                  address: venue.address || '',
                };
              });
          }
        } catch (shortlistError) {
          console.error('Error getting shortlist:', shortlistError);
        }
      }

      // Get first 5 venues for poll
      const pollVenues = venues.slice(0, 5);

      if (pollVenues.length > 0) {
        // Send announcement/summary first
        const announcement = announcementParts.join('\n');
        await bot.telegram.sendMessage(groupChatId, announcement);

        // Create poll options
        const pollOptions = pollVenues.map((v, i) => {
          const name = v.name || 'Без названия';
          const rating = v.rating ? ` ⭐${v.rating}` : '';
          const text = `${i + 1}. ${name}${rating}`.trim();
          return text.slice(0, 100);
        });

        // Send poll to group
        const pollMessage = await bot.telegram.sendPoll(groupChatId, '🗳️ Куда идём?', pollOptions, {
          is_anonymous: false,
          allows_multiple_answers: true,
        });

        // Store poll context
        const pollId = String(pollMessage.poll.id);
        this.stateService.setPollContext(pollId, {
          planId: plan.id,
          venueIds: pollVenues.map((v) => v.id),
          groupChatId: groupChatId,
          creatorId: userId,
        });

        // Send buttons after poll
        await bot.telegram.sendMessage(groupChatId, 'Голосуйте в опросе выше 👆', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Показать ещё варианты', callback_data: `po:${plan.id.slice(0, 8)}` }],
              [{ text: '🏁 Закрыть голосование', callback_data: `px:${plan.id.slice(0, 8)}` }],
            ],
          },
        });

        // Store plan info with poll ID
        (this.stateService as any).planIdMap = (this.stateService as any).planIdMap || new Map();
        (this.stateService as any).planIdMap.set(plan.id.slice(0, 8), {
          fullId: plan.id,
          creatorId: userId,
          participantCount: 1,
          joinedUsers: new Set<string>([userId]),
          pollId: pollId,
          pollMessageId: pollMessage.message_id,
          allVenues: venues,
          rotationIndex: 5, // Start from 5 since we showed first 5
        });
      } else {
        // No venues available, send announcement without poll
        const announcement =
          announcementParts.join('\n') + '\n\n⏳ Список заведений генерируется...';
        await bot.telegram.sendMessage(groupChatId, announcement, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📋 Показать варианты', callback_data: `po:${plan.id.slice(0, 8)}` }],
            ],
          },
        });

        // Store plan info without poll
        (this.stateService as any).planIdMap = (this.stateService as any).planIdMap || new Map();
        (this.stateService as any).planIdMap.set(plan.id.slice(0, 8), {
          fullId: plan.id,
          creatorId: userId,
          participantCount: 1,
          joinedUsers: new Set<string>([userId]),
        });
      }

      // Clear plan context
      this.stateService.clearPlanContext(userId);

      await ctx.answerCbQuery?.();
    } catch (error) {
      console.error('Error creating plan:', error);
      await ctx.reply('Ошибка при создании плана. Попробуйте позже.');
      await ctx.answerCbQuery?.('Ошибка');
    }
  }

  /**
   * Handle join plan button click
   */
  async handleJoinPlan(ctx: Context, shortPlanId: string) {
    try {
      const userId = ctx.from?.id.toString() || '';
      const userName = ctx.from?.first_name || 'Участник';

      const planInfo = this.getPlanInfo(shortPlanId);
      if (!planInfo) {
        await ctx.answerCbQuery('План не найден');
        return;
      }

      // Check if user already joined
      if (planInfo.joinedUsers.has(userId)) {
        await ctx.answerCbQuery('✅ Ты уже в списке!');
        return;
      }

      // Join via API
      try {
        await this.apiClient.joinPlan(planInfo.fullId, userId, {}, undefined);
      } catch (error) {
        // Check if error is because user already joined
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError?.response?.status === 400) {
          // User might already be a participant, mark as joined anyway
          planInfo.joinedUsers.add(userId);
          await ctx.answerCbQuery('✅ Ты уже в списке!');
          return;
        }
        throw error;
      }

      // Mark user as joined and update count
      planInfo.joinedUsers.add(userId);
      planInfo.participantCount = planInfo.joinedUsers.size;

      // Note: "Я иду" button is no longer used - participation is determined by voting
      await ctx.answerCbQuery(`✅ ${userName}, ты добавлен в план!`);
    } catch (error) {
      console.error('Error joining plan:', error);
      await ctx.answerCbQuery('Ошибка');
    }
  }

  /**
   * Show plan options as a native Telegram poll
   */
  async handleShowOptions(ctx: Context, shortPlanId: string, bot: Telegraf) {
    try {
      const userId = ctx.from?.id.toString() || '';
      const chatId = ctx.chat?.id;

      if (!chatId) {
        await ctx.answerCbQuery('Ошибка');
        return;
      }

      const planInfo = this.getPlanInfo(shortPlanId);
      if (!planInfo) {
        await ctx.answerCbQuery('План не найден');
        return;
      }

      const planId = planInfo.fullId;
      // Ensure both are strings for comparison
      const isCreator = String(planInfo.creatorId) === String(userId);

      // If poll already exists and we have stored venues, check if we can rotate
      if (planInfo.pollId && planInfo.allVenues && planInfo.allVenues.length > 0) {
        const allVenues = planInfo.allVenues;
        const rotationIndex = planInfo.rotationIndex || 0;
        const hasMoreVenues = rotationIndex < allVenues.length;

        if (hasMoreVenues) {
          // Use rotation handler instead
          await this.handleRotateVenues(ctx, shortPlanId, bot);
          return;
        } else {
          // No more venues to show
          await ctx.answerCbQuery('Все варианты уже показаны');
          return;
        }
      }

      // If poll exists but no stored venues, we need to get venues first
      // Then we'll use rotation logic
      const shouldRotate = planInfo.pollId !== undefined;

      // Try to start voting or get existing shortlist
      let venues: Array<{ id: string; name: string; rating?: number; address: string }> = [];

      try {
        const voteResponse = await this.apiClient.startVoting(planId);
        const voteData = voteResponse.data as {
          vote?: unknown;
          options?: Array<{
            venue: { name: string; rating?: number; address: string };
            venueId: string;
          }>;
        };

        // Debug: log the actual response structure
        console.log('startVoting response:', JSON.stringify(voteData, null, 2));

        if (voteData?.options && Array.isArray(voteData.options)) {
          venues = voteData.options
            .filter((o) => {
              const isValid = o && o.venue && (o.venue.name || o.venueId) && o.venueId;
              if (!isValid) {
                console.warn('Invalid option in startVoting response:', o);
              }
              return isValid;
            })
            .map((o) => ({
              id: o.venueId,
              name: o.venue?.name || 'Без названия',
              rating: o.venue?.rating,
              address: o.venue?.address || '',
            }));
        }
      } catch (startError: unknown) {
        const axiosError = startError as { response?: { status?: number } };
        if (axiosError?.response?.status === 400) {
          // Voting already started, get shortlist directly
          const shortlistResponse = await this.apiClient.getPlanOptions(planId);

          // Debug: log the actual response structure
          console.log('getPlanOptions response:', JSON.stringify(shortlistResponse.data, null, 2));

          if (shortlistResponse.data && Array.isArray(shortlistResponse.data)) {
            venues = (shortlistResponse.data as any[])
              .filter((item: any) => {
                // Handle both structures: { venueId, venue } or direct Venue
                const venue = item.venue || item;
                const isValid = venue && (venue.id || item.venueId) && venue.name;
                if (!isValid) {
                  console.warn('Invalid venue in getPlanOptions response:', item);
                }
                return isValid;
              })
              .map((item: any) => {
                // Handle both structures: { venueId, venue } or direct Venue
                const venue = item.venue || item;
                return {
                  id: item.venueId || venue.id || '',
                  name: venue.name || 'Без названия',
                  rating: venue.rating,
                  address: venue.address || '',
                };
              });
          }
        } else {
          console.error('Error starting voting:', startError);
          throw startError;
        }
      }

      if (!venues || venues.length === 0) {
        // Shortlist might still be generating, wait a bit and retry once
        await ctx.answerCbQuery('⏳ Генерирую список...');

        // Wait 3 seconds and retry
        await new Promise((resolve) => setTimeout(resolve, 3000));

        try {
          const retryResponse = await this.apiClient.getPlanOptions(planId);
          if (
            retryResponse.data &&
            Array.isArray(retryResponse.data) &&
            retryResponse.data.length > 0
          ) {
            venues = (retryResponse.data as any[])
              .filter((item: any) => {
                const venue = item.venue || item;
                return venue && (venue.id || item.venueId) && venue.name;
              })
              .map((item: any) => {
                const venue = item.venue || item;
                return {
                  id: item.venueId || venue.id || '',
                  name: venue.name || 'Без названия',
                  rating: venue.rating,
                  address: venue.address || '',
                };
              });
          }
        } catch (retryError) {
          console.error('Retry failed:', retryError);
        }

        if (!venues || venues.length === 0) {
          await ctx.reply(
            '⏳ Список заведений ещё генерируется...\n\nПопробуйте нажать "📋 Показать варианты" через 10-15 секунд.',
          );
          return;
        }
      }

      console.log('Total venues fetched from API:', venues.length);

      // Store all venues in planInfo for rotation (only if not already stored)
      if (!planInfo.allVenues || planInfo.allVenues.length === 0) {
        planInfo.allVenues = [...venues]; // Create a copy to avoid reference issues
        // If poll already exists, start rotation from 5 (first 5 were already shown)
        planInfo.rotationIndex = shouldRotate ? 5 : 0;
        console.log('Stored all venues for rotation:', {
          totalVenues: planInfo.allVenues.length,
          shortPlanId,
          rotationIndex: planInfo.rotationIndex,
        });
        // Explicitly update the map to ensure changes are saved
        const map = (this.stateService as any).planIdMap;
        if (map) {
          map.set(shortPlanId, planInfo);
        }
      }

      // If poll already exists, use rotation handler
      if (shouldRotate && planInfo.allVenues && planInfo.allVenues.length > 0) {
        await this.handleRotateVenues(ctx, shortPlanId, bot);
        return;
      }

      // Use stored venues if available, otherwise use fetched venues
      const allVenues = planInfo.allVenues || venues;
      const rotationIndex = planInfo.rotationIndex || 0;

      console.log('Venue rotation state:', {
        totalVenues: allVenues.length,
        rotationIndex,
        storedVenues: planInfo.allVenues?.length || 0,
      });

      // Get next 5 venues (or remaining if less than 5)
      const VENUES_PER_POLL = 5;
      const startIndex = rotationIndex;
      const endIndex = Math.min(startIndex + VENUES_PER_POLL, allVenues.length);
      const pollVenues = allVenues.slice(startIndex, endIndex);

      if (pollVenues.length === 0) {
        await ctx.answerCbQuery('Больше нет вариантов для показа');
        return;
      }

      // Create poll options (max 100 chars each)
      const pollOptions = pollVenues.map((v, i) => {
        const name = v.name || 'Без названия';
        const rating = v.rating ? ` ⭐${v.rating}` : '';
        const text = `${i + 1}. ${name}${rating}`.trim();
        return text.slice(0, 100); // Telegram limit
      });

      // Validate poll options before sending
      if (pollOptions.some((opt) => !opt || opt.includes('undefined'))) {
        console.error('Invalid poll options:', pollOptions);
        console.error('Source venues:', pollVenues);
        await ctx.reply('Ошибка: некорректные данные заведений. Попробуйте позже.');
        await ctx.answerCbQuery();
        return;
      }

      // Send native poll (single choice)
      const pollMessage = await bot.telegram.sendPoll(chatId, '🗳️ Куда идём?', pollOptions, {
        is_anonymous: false,
        allows_multiple_answers: false, // Single choice
      });

      // Store poll context for vote tracking
      // Convert poll ID to string to ensure consistent storage/retrieval
      const pollId = String(pollMessage.poll.id);
      console.log('Storing poll context:', { pollId, planId, venueCount: pollVenues.length });
      this.stateService.setPollContext(pollId, {
        planId,
        venueIds: pollVenues.map((v) => v.id),
        groupChatId: chatId,
        creatorId: userId,
      });

      // Also store in plan info for closing (ensure string format)
      planInfo.pollId = pollId;
      planInfo.pollMessageId = pollMessage.message_id;

      // Update rotation index for next time
      planInfo.rotationIndex = endIndex;

      // Explicitly update the map to ensure changes are saved
      const map = (this.stateService as any).planIdMap;
      if (map) {
        map.set(shortPlanId, planInfo);
      }

      // Build keyboard buttons
      const keyboardButtons = [];

      // Add "Show next 5" button if there are more venues (only for creator)
      // Use planInfo.allVenues directly to ensure we have the full list
      const totalVenues = planInfo.allVenues?.length || allVenues.length;
      const hasMoreVenues = endIndex < totalVenues;

      // Debug logging
      console.log('Button visibility check:', {
        hasMoreVenues,
        isCreator,
        endIndex,
        totalVenues,
        allVenuesLength: allVenues.length,
        storedVenuesLength: planInfo.allVenues?.length || 0,
        rotationIndex,
        creatorId: planInfo.creatorId,
        userId,
        creatorIdType: typeof planInfo.creatorId,
        userIdType: typeof userId,
        creatorIdEquals: String(planInfo.creatorId) === String(userId),
      });

      if (hasMoreVenues && isCreator) {
        keyboardButtons.push([
          { text: '🔄 Показать ещё варианты', callback_data: `pr:${shortPlanId}` },
        ]);
        console.log('✅ Added "Показать ещё варианты" button');
      } else {
        console.log('❌ Button NOT added:', {
          hasMoreVenues,
          isCreator,
          reason: !hasMoreVenues ? 'no more venues' : 'not creator',
        });
      }

      // Add close button
      keyboardButtons.push([
        { text: '🏁 Закрыть голосование', callback_data: `px:${shortPlanId}` },
      ]);

      console.log('Final keyboard buttons:', JSON.stringify(keyboardButtons, null, 2));

      // Send buttons
      await ctx.reply('Когда все проголосуют, нажмите "Закрыть голосование":', {
        reply_markup: {
          inline_keyboard: keyboardButtons,
        },
      });

      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error showing options:', error);
      await ctx.answerCbQuery('Ошибка при загрузке вариантов');
    }
  }

  /**
   * Rotate to next 5 venues (creator only)
   */
  async handleRotateVenues(ctx: Context, shortPlanId: string, bot: Telegraf) {
    try {
      const userId = ctx.from?.id.toString() || '';
      const chatId = ctx.chat?.id;

      if (!chatId) {
        await ctx.answerCbQuery('Ошибка');
        return;
      }

      const planInfo = this.getPlanInfo(shortPlanId);
      if (!planInfo) {
        await ctx.answerCbQuery('План не найден');
        return;
      }

      // Only creator can rotate
      // Ensure both are strings for comparison
      if (String(planInfo.creatorId) !== String(userId)) {
        await ctx.answerCbQuery('Только создатель плана может просматривать другие варианты');
        return;
      }

      // Check if we have stored venues
      if (!planInfo.allVenues || planInfo.allVenues.length === 0) {
        await ctx.answerCbQuery('Нет сохранённых вариантов');
        return;
      }

      const allVenues = planInfo.allVenues;
      const rotationIndex = planInfo.rotationIndex || 0;

      // Get next 5 venues
      const VENUES_PER_POLL = 5;
      const startIndex = rotationIndex;
      const endIndex = Math.min(startIndex + VENUES_PER_POLL, allVenues.length);
      const pollVenues = allVenues.slice(startIndex, endIndex);

      if (pollVenues.length === 0) {
        await ctx.answerCbQuery('Больше нет вариантов для показа');
        return;
      }

      // Don't stop previous poll - users should be able to vote in all polls
      // Just create a new poll with next venues

      // Create poll options
      const pollOptions = pollVenues.map((v, i) => {
        const name = v.name || 'Без названия';
        const rating = v.rating ? ` ⭐${v.rating}` : '';
        const text = `${i + 1}. ${name}${rating}`.trim();
        return text.slice(0, 100);
      });

      // Send new poll (single choice)
      const pollMessage = await bot.telegram.sendPoll(
        chatId,
        '🗳️ Куда идём? (другие варианты)',
        pollOptions,
        {
          is_anonymous: false,
          allows_multiple_answers: false, // Single choice
        },
      );

      // Store new poll context
      const pollId = String(pollMessage.poll.id);
      const planId = planInfo.fullId;
      this.stateService.setPollContext(pollId, {
        planId,
        venueIds: pollVenues.map((v) => v.id),
        groupChatId: chatId,
        creatorId: userId,
      });

      // Update plan info
      planInfo.pollId = pollId;
      planInfo.pollMessageId = pollMessage.message_id;
      planInfo.rotationIndex = endIndex;

      // Build keyboard buttons
      const keyboardButtons = [];
      const hasMoreVenues = endIndex < allVenues.length;
      if (hasMoreVenues) {
        keyboardButtons.push([
          { text: '🔄 Показать ещё варианты', callback_data: `pr:${shortPlanId}` },
        ]);
      }
      keyboardButtons.push([
        { text: '🏁 Закрыть голосование', callback_data: `px:${shortPlanId}` },
      ]);

      await ctx.reply('Когда все проголосуют, нажмите "Закрыть голосование":', {
        reply_markup: {
          inline_keyboard: keyboardButtons,
        },
      });

      await ctx.answerCbQuery('✅ Показаны следующие варианты');
    } catch (error) {
      console.error('Error rotating venues:', error);
      await ctx.answerCbQuery('Ошибка при загрузке вариантов');
    }
  }

  /**
   * Handle poll answer with synchronization (multiple choice support)
   * Syncs all votes for a user based on selected options
   */
  async handlePollAnswerSync(userId: string, pollId: string | number, optionIds: number[]) {
    try {
      // Convert poll ID to string for consistent lookup
      const pollIdStr = String(pollId);
      console.log('Poll answer received (sync):', { pollId: pollIdStr, userId, optionIds });

      const pollContext = this.stateService.getPollContext(pollIdStr);
      if (!pollContext) {
        console.log('Poll context not found for poll:', pollIdStr);
        return;
      }

      const { planId, venueIds } = pollContext;

      // Map option indices to venue IDs
      const selectedVenueIds = optionIds
        .map((optionIndex) => venueIds[optionIndex])
        .filter((venueId) => venueId !== undefined);

      console.log('Selected venue IDs:', selectedVenueIds);

      // Get current votes for this user
      const currentVotesResponse = await this.apiClient.getUserVotes(planId, userId);
      const currentVenueIds = currentVotesResponse.data || [];

      console.log('Current venue IDs:', currentVenueIds);

      // Find venue IDs to remove (in current votes but not in selected)
      const venueIdsToRemove = currentVenueIds.filter(
        (venueId) => !selectedVenueIds.includes(venueId),
      );

      // Find venue IDs to add (in selected but not in current votes)
      const venueIdsToAdd = selectedVenueIds.filter(
        (venueId) => !currentVenueIds.includes(venueId),
      );

      console.log('Venue IDs to remove:', venueIdsToRemove);
      console.log('Venue IDs to add:', venueIdsToAdd);

      // Remove votes for unselected venues
      for (const venueId of venueIdsToRemove) {
        try {
          await this.apiClient.removeVote(planId, userId, venueId);
          console.log(`✅ Vote removed: user=${userId}, venue=${venueId}`);
        } catch (error) {
          console.error(`Error removing vote for venue ${venueId}:`, error);
        }
      }

      // Add votes for newly selected venues
      for (const venueId of venueIdsToAdd) {
        try {
          await this.apiClient.castVote(planId, userId, venueId);
          console.log(`✅ Vote added: user=${userId}, venue=${venueId}`);
        } catch (voteError: unknown) {
          const axiosError = voteError as { response?: { status?: number } };
          // If 403 (Forbidden), user might not be a participant yet
          if (axiosError?.response?.status === 403) {
            console.log(`User ${userId} is not a participant, joining plan first...`);
            try {
              // Automatically join the plan
              await this.apiClient.joinPlan(planId, userId);
              console.log(`User ${userId} joined plan ${planId}`);

              // Retry voting
              await this.apiClient.castVote(planId, userId, venueId);
              console.log(`Vote recorded after join: user=${userId}, venue=${venueId}`);
            } catch (joinError) {
              console.error('Error joining plan or casting vote:', joinError);
            }
          } else {
            console.error(`Error casting vote for venue ${venueId}:`, voteError);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing poll votes:', error);
    }
  }

  /**
   * Handle single choice poll answer
   * For single choice polls, user can only select one option at a time
   */
  async handlePollAnswerSingle(userId: string, pollId: string | number, optionIndex: number) {
    try {
      // Convert poll ID to string for consistent lookup
      const pollIdStr = String(pollId);
      console.log('Poll answer received (single choice):', {
        pollId: pollIdStr,
        userId,
        optionIndex,
      });

      const pollContext = this.stateService.getPollContext(pollIdStr);
      if (!pollContext) {
        console.log('Poll context not found for poll:', pollIdStr);
        return;
      }

      const { planId, venueIds } = pollContext;
      const venueId = venueIds[optionIndex];

      console.log('Poll context details:', {
        pollId: pollIdStr,
        planId,
        venueIds,
        optionIndex,
        selectedVenueId: venueId,
        venueIdsLength: venueIds.length,
      });

      if (!venueId) {
        console.log('Invalid option index:', optionIndex, 'available venues:', venueIds.length);
        return;
      }

      // Get current votes for this user in this plan
      const currentVotesResponse = await this.apiClient.getUserVotes(planId, userId);
      const currentVenueIds = currentVotesResponse.data || [];

      // Remove all previous votes (single choice - user can only vote for one venue at a time)
      for (const currentVenueId of currentVenueIds) {
        try {
          await this.apiClient.removeVote(planId, userId, currentVenueId);
          console.log(`✅ Previous vote removed: user=${userId}, venue=${currentVenueId}`);
        } catch (error) {
          console.error(`Error removing previous vote for venue ${currentVenueId}:`, error);
        }
      }

      // Cast new vote
      try {
        await this.apiClient.castVote(planId, userId, venueId);
        console.log(`✅ Vote recorded: user=${userId}, venue=${venueId}, plan=${planId}`);
      } catch (voteError: unknown) {
        const axiosError = voteError as { response?: { status?: number } };
        // If 403 (Forbidden), user might not be a participant yet
        if (axiosError?.response?.status === 403) {
          console.log(`User ${userId} is not a participant, joining plan first...`);
          try {
            // Automatically join the plan
            await this.apiClient.joinPlan(planId, userId);
            console.log(`User ${userId} joined plan ${planId}`);

            // Retry voting
            await this.apiClient.castVote(planId, userId, venueId);
            console.log(`Vote recorded after join: user=${userId}, venue=${venueId}`);
          } catch (joinError) {
            console.error('Error joining plan or casting vote:', joinError);
          }
        } else {
          console.error(`Error casting vote for venue ${venueId}:`, voteError);
        }
      }
    } catch (error) {
      console.error('Error handling poll answer:', error);
    }
  }

  /**
   * Handle poll answer removal (user removed their vote)
   */
  async handlePollAnswerRemoved(userId: string, pollId: string | number) {
    try {
      // Convert poll ID to string for consistent lookup
      const pollIdStr = String(pollId);
      console.log('Poll answer removed:', { pollId: pollIdStr, userId });

      const pollContext = this.stateService.getPollContext(pollIdStr);
      if (!pollContext) {
        console.log('Poll context not found for poll:', pollIdStr);
        return;
      }

      const { planId } = pollContext;

      // Get current votes for this user in this plan
      const currentVotesResponse = await this.apiClient.getUserVotes(planId, userId);
      const currentVenueIds = currentVotesResponse.data || [];

      // Remove all votes (user removed their selection)
      for (const venueId of currentVenueIds) {
        try {
          await this.apiClient.removeVote(planId, userId, venueId);
          console.log(`✅ Vote removed: user=${userId}, venue=${venueId}`);
        } catch (error) {
          console.error(`Error removing vote for venue ${venueId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error handling poll answer removal:', error);
    }
  }

  /**
   * Handle poll answer (native Telegram poll) - legacy method for single vote
   */
  async handlePollAnswer(userId: string, pollId: string | number, optionIndex: number) {
    try {
      // Convert poll ID to string to ensure consistent lookup
      const pollIdStr = String(pollId);
      console.log('Poll answer received:', { pollId: pollIdStr, userId, optionIndex });

      const pollContext = this.stateService.getPollContext(pollIdStr);
      if (!pollContext) {
        console.log('Poll context not found for poll:', pollIdStr);
        console.log(
          'Available poll contexts:',
          Array.from((this.stateService as any).pollContexts?.keys() || []),
        );
        return;
      }

      const { planId, venueIds } = pollContext;
      const venueId = venueIds[optionIndex];

      console.log('Poll context details:', {
        pollId: pollIdStr,
        planId,
        venueIds,
        optionIndex,
        selectedVenueId: venueId,
        venueIdsLength: venueIds.length,
      });

      if (!venueId) {
        console.log('Invalid option index:', optionIndex, 'available venues:', venueIds.length);
        return;
      }

      // Try to cast vote
      try {
        await this.apiClient.castVote(planId, userId, venueId);
        console.log(`✅ Vote recorded: user=${userId}, venue=${venueId}, plan=${planId}`);
      } catch (voteError: unknown) {
        const axiosError = voteError as { response?: { status?: number } };
        // If 403 (Forbidden), user might not be a participant yet
        if (axiosError?.response?.status === 403) {
          console.log(`User ${userId} is not a participant, joining plan first...`);
          try {
            // Automatically join the plan
            await this.apiClient.joinPlan(planId, userId);
            console.log(`User ${userId} joined plan ${planId}`);

            // Retry voting
            await this.apiClient.castVote(planId, userId, venueId);
            console.log(`Vote recorded after join: user=${userId}, venue=${venueId}`);
          } catch (joinError) {
            console.error('Error joining plan or casting vote:', joinError);
            throw joinError;
          }
        } else {
          // Re-throw other errors
          throw voteError;
        }
      }
    } catch (error) {
      console.error('Error recording poll vote:', error);
    }
  }

  /**
   * Handle close voting / announce winner
   */
  async handleClosePlan(ctx: Context, shortPlanId: string, bot: Telegraf) {
    try {
      const userId = ctx.from?.id.toString() || '';
      const chatId = ctx.chat?.id;

      const planInfo = this.getPlanInfo(shortPlanId);
      if (!planInfo) {
        await ctx.answerCbQuery('План не найден');
        return;
      }

      // Only creator can close
      // Ensure both are strings for comparison
      if (String(planInfo.creatorId) !== String(userId)) {
        await ctx.answerCbQuery('Только создатель плана может закрыть голосование');
        return;
      }

      const planId = planInfo.fullId;

      // Close the plan via API
      const result = await this.apiClient.closePlan(planId, userId);
      const closeData = result.data as {
        plan?: unknown;
        winner?: {
          venue: { name: string; rating?: number; address: string };
          venueId: string;
          voteCount: number;
        };
      };

      console.log('Plan closed, winner data:', JSON.stringify(closeData, null, 2));

      const winner = closeData?.winner;

      // Stop the last poll if we have it (optional - API will count votes from all polls)
      if (planInfo.pollId && planInfo.pollMessageId && chatId) {
        try {
          await bot.telegram.stopPoll(chatId, planInfo.pollMessageId);
        } catch (stopError) {
          // Poll might already be stopped, that's OK
        }
      }

      // Clear all poll contexts for this plan (there might be multiple polls from rotation)
      // Note: All votes are already recorded in the database, so stopping polls is optional
      this.stateService.clearPollContextsByPlanId(planId);

      if (!winner) {
        await ctx.reply(
          '❌ Не удалось определить победителя.\n\nВозможно, никто не проголосовал. Попробуйте создать новый план.',
        );
        await ctx.answerCbQuery();
        return;
      }

      // Announce winner
      const winnerAnnouncement =
        `🏆 Победитель!\n\n` +
        `**${winner.venue.name}**\n` +
        `⭐ ${winner.venue.rating || 'N/A'}\n` +
        `📍 ${winner.venue.address}\n\n` +
        `Голосов: ${winner.voteCount}`;

      // Create short plan ID for callback (first 8 chars)
      const shortId = planId.slice(0, 8);

      await ctx.reply(winnerAnnouncement, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📍 Маршрут', callback_data: `route:${winner.venueId}` }],
            [{ text: '📋 Забронировать', callback_data: `book:${shortId}` }],
          ],
        },
      });

      await ctx.answerCbQuery('✅ Голосование закрыто!');
    } catch (error) {
      console.error('Error closing plan:', error);
      await ctx.answerCbQuery('Ошибка при закрытии');
    }
  }

  /**
   * Handle cancel plan creation
   */
  async handleCancel(ctx: Context) {
    try {
      const userId = ctx.from?.id.toString() || '';
      this.stateService.clearPlanContext(userId);

      await ctx.reply('Создание плана отменено.');
      await ctx.answerCbQuery?.();
    } catch (error) {
      console.error('Error canceling plan:', error);
    }
  }

  /**
   * Handle booking request
   */
  async handleBookingRequest(ctx: Context, shortPlanId: string) {
    try {
      await ctx.answerCbQuery('⏳ Создаю запрос на бронирование...');

      // Find plan by short ID
      const planInfo = this.getPlanInfo(shortPlanId);
      if (!planInfo) {
        await ctx.reply('❌ План не найден. Возможно, он был удалён.');
        return;
      }

      const planId = planInfo.fullId;

      // Get plan details to get date, time, and participants count
      const planResponse = await this.apiClient.getPlan(planId);
      const plan = planResponse.data as {
        id: string;
        date: string;
        time: string;
        participants?: Array<{ id: string }>;
        winningVenueId?: string;
        winningVenue?: { id: string };
      };

      if (!plan) {
        await ctx.reply('❌ Не удалось получить данные плана.');
        return;
      }

      // Get winning venue ID
      const venueId = plan.winningVenueId || plan.winningVenue?.id;
      if (!venueId) {
        await ctx.reply('❌ Не удалось определить заведение для бронирования.');
        return;
      }

      // Prepare booking request data
      const requestedDate = plan.date; // ISO date string (YYYY-MM-DD)
      const requestedTime = plan.time; // HH:mm format
      const participantsCount = plan.participants?.length || 1;

      // Get venue details for contact information
      const venueResponse = await this.apiClient.getVenue(venueId);
      const venue = venueResponse.data as {
        name: string;
        address: string;
        location?: { coordinates: [number, number] }; // [lng, lat]
        phone?: string;
        website?: string;
        socialMedia?: {
          facebook?: string;
          instagram?: string;
          twitter?: string;
        };
      };

      // Create booking request
      try {
        const bookingResponse = await this.apiClient.createBookingRequest(
          planId,
          venueId,
          requestedDate,
          requestedTime,
          participantsCount,
        );

        const bookingData = bookingResponse.data as {
          id: string;
          status: string;
          requestedDate: string;
          requestedTime: string;
        };

        await ctx.reply(
          `✅ Запрос на бронирование создан!\n\n` +
            `📅 Дата: ${requestedDate}\n` +
            `🕐 Время: ${requestedTime}\n` +
            `👥 Гостей: ${participantsCount}\n\n` +
            `Статус: ${bookingData.status === 'pending' ? '⏳ Ожидает подтверждения' : bookingData.status}\n\n` +
            `Заведение получит уведомление и подтвердит бронирование.`,
        );
      } catch (bookingError: unknown) {
        const axiosError = bookingError as {
          response?: { status?: number; data?: { message?: string } };
        };
        if (axiosError?.response?.status === 400) {
          const message = axiosError.response.data?.message || '';

          // Check if venue is not a partner
          if (message.includes('not a partner') || message.includes('не является партнёром')) {
            // Show contact options for non-partner venues
            await this.showVenueContacts(ctx, venue, venueId);
          } else {
            await ctx.reply(
              `❌ ${message || 'Не удалось создать запрос на бронирование'}\n\nВозможно, план ещё не закрыт.`,
            );
          }
        } else {
          console.error('Error creating booking request:', bookingError);
          await ctx.reply(
            '❌ Произошла ошибка при создании запроса на бронирование. Попробуйте позже.',
          );
        }
      }
    } catch (error) {
      console.error('Error handling booking request:', error);
      await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
  }

  /**
   * Normalize phone number to international format (digits only)
   */
  private normalizePhoneNumber(phone: string): string | null {
    if (!phone) return null;
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    // If starts with +, keep it; otherwise assume it's local format
    return cleaned.startsWith('+') ? cleaned : cleaned;
  }

  /**
   * Generate WhatsApp link from phone number
   */
  private generateWhatsAppLink(phone: string): string {
    const normalized = this.normalizePhoneNumber(phone);
    if (!normalized) return '';
    // Remove + if present, wa.me doesn't need it
    const number = normalized.replace(/^\+/, '');
    return `https://wa.me/${number}`;
  }

  /**
   * Generate Viber link from phone number
   */
  private generateViberLink(phone: string): string {
    const normalized = this.normalizePhoneNumber(phone);
    if (!normalized) return '';
    // Viber needs + prefix
    const number = normalized.startsWith('+') ? normalized : `+${normalized}`;
    return `viber://chat?number=${number}`;
  }

  /**
   * Show venue contact options for non-partner venues
   */
  private async showVenueContacts(
    ctx: Context,
    venue: {
      name: string;
      address: string;
      location?: { coordinates: [number, number] };
      phone?: string;
      website?: string;
      socialMedia?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        telegram?: string;
        whatsapp?: string;
        viber?: string;
        messenger?: string;
      };
    },
    venueId: string,
  ) {
    const buttons: Array<Array<{ text: string; url?: string; callback_data?: string }>> = [];

    // Phone button
    if (venue.phone) {
      buttons.push([{ text: `📞 Позвонить: ${venue.phone}`, url: `tel:${venue.phone}` }]);
    }

    // Website button
    if (venue.website) {
      buttons.push([{ text: '🌐 Открыть сайт', url: venue.website }]);
    }

    // Social media and messenger buttons
    const socialButtons: Array<{ text: string; url: string }> = [];

    // Messengers (priority - more direct communication)
    // Telegram - only if explicitly provided (can't generate from phone)
    if (venue.socialMedia?.telegram) {
      const telegramUrl = venue.socialMedia.telegram.startsWith('http')
        ? venue.socialMedia.telegram
        : venue.socialMedia.telegram.startsWith('@')
          ? `https://t.me/${venue.socialMedia.telegram.slice(1)}`
          : `https://t.me/${venue.socialMedia.telegram}`;
      socialButtons.push({ text: '💬 Telegram', url: telegramUrl });
    }

    // WhatsApp - use explicit link if provided, otherwise generate from phone
    if (venue.socialMedia?.whatsapp) {
      const whatsappUrl = venue.socialMedia.whatsapp.startsWith('http')
        ? venue.socialMedia.whatsapp
        : `https://wa.me/${venue.socialMedia.whatsapp.replace(/[^0-9]/g, '')}`;
      socialButtons.push({ text: '💚 WhatsApp', url: whatsappUrl });
    } else if (venue.phone) {
      // Auto-generate WhatsApp link from phone number
      const whatsappUrl = this.generateWhatsAppLink(venue.phone);
      if (whatsappUrl) {
        socialButtons.push({ text: '💚 WhatsApp', url: whatsappUrl });
      }
    }

    // Viber - use explicit link if provided, otherwise generate from phone
    if (venue.socialMedia?.viber) {
      const viberUrl = venue.socialMedia.viber.startsWith('http')
        ? venue.socialMedia.viber
        : `viber://chat?number=${venue.socialMedia.viber.replace(/[^0-9]/g, '')}`;
      socialButtons.push({ text: '💜 Viber', url: viberUrl });
    } else if (venue.phone) {
      // Auto-generate Viber link from phone number
      const viberUrl = this.generateViberLink(venue.phone);
      if (viberUrl) {
        socialButtons.push({ text: '💜 Viber', url: viberUrl });
      }
    }

    // Messenger - only if explicitly provided (can't generate from phone)
    if (venue.socialMedia?.messenger) {
      socialButtons.push({ text: '💙 Messenger', url: venue.socialMedia.messenger });
    }

    // Social networks
    if (venue.socialMedia?.facebook) {
      socialButtons.push({ text: '📘 Facebook', url: venue.socialMedia.facebook });
    }
    if (venue.socialMedia?.instagram) {
      socialButtons.push({ text: '📷 Instagram', url: venue.socialMedia.instagram });
    }
    if (venue.socialMedia?.twitter) {
      socialButtons.push({ text: '🐦 Twitter', url: venue.socialMedia.twitter });
    }

    // Add buttons in rows (max 2 per row for better UX)
    if (socialButtons.length > 0) {
      for (let i = 0; i < socialButtons.length; i += 2) {
        buttons.push(socialButtons.slice(i, i + 2));
      }
    }

    // Google Maps link (always show as fallback)
    if (venue.location?.coordinates) {
      const [lng, lat] = venue.location.coordinates;
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(venue.name + ' ' + venue.address)}`;
      buttons.push([{ text: '📍 Открыть в Google Maps', url: googleMapsUrl }]);
    } else {
      // Fallback: search by address
      const searchQuery = encodeURIComponent(`${venue.name} ${venue.address}`);
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
      buttons.push([{ text: '📍 Открыть в Google Maps', url: googleMapsUrl }]);
    }

    // Build message with available contact info
    let message = `📞 Свяжитесь с заведением напрямую\n\n**${venue.name}**\n📍 ${venue.address}\n\n`;

    // Determine available messengers (including auto-generated from phone)
    const availableMessengers: string[] = [];
    if (venue.socialMedia?.telegram) availableMessengers.push('Telegram');
    // WhatsApp: explicit or auto-generated from phone
    if (venue.socialMedia?.whatsapp || venue.phone) availableMessengers.push('WhatsApp');
    // Viber: explicit or auto-generated from phone
    if (venue.socialMedia?.viber || venue.phone) availableMessengers.push('Viber');
    if (venue.socialMedia?.messenger) availableMessengers.push('Messenger');

    const hasContacts =
      venue.phone || venue.website || venue.socialMedia || availableMessengers.length > 0;
    if (hasContacts) {
      message += 'Доступные способы связи:\n';
      if (venue.phone) message += `📞 ${venue.phone}\n`;
      if (venue.website) message += `🌐 ${venue.website}\n`;
      if (availableMessengers.length > 0) {
        message += `💬 ${availableMessengers.join(', ')}\n`;
      }
      message += '\n';
    }

    message +=
      'Это заведение не является партнёром, поэтому бронирование через бота недоступно.\n\nИспользуйте кнопки ниже для связи:';

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons as any,
      },
    });
  }

  // ============ Helper Methods ============

  private getPlanInfo(shortPlanId: string): {
    fullId: string;
    creatorId: string;
    participantCount: number;
    joinedUsers: Set<string>;
    pollId?: string;
    pollMessageId?: number;
    allVenues?: Array<{ id: string; name: string; rating?: number; address: string }>;
    rotationIndex?: number;
  } | null {
    const map = (this.stateService as any).planIdMap;
    if (!map) return null;
    const info = map.get(shortPlanId);
    if (info && !info.joinedUsers) {
      info.joinedUsers = new Set<string>();
    }
    if (info && info.rotationIndex === undefined) {
      info.rotationIndex = 0;
    }
    return info || null;
  }

  /**
   * Ensure city is selected - auto-select if only one city available
   * Returns cityId if selected, null otherwise
   */
  private async ensureCitySelected(userId: string): Promise<string | null> {
    try {
      const citiesResponse = await this.apiClient.getCities();
      const cities = citiesResponse.data || [];

      const validCities = cities.filter((c) => c.id && c.name);

      // If only one city, auto-select it
      if (validCities.length === 1) {
        const cityId = validCities[0].id!;
        this.stateService.setCity(userId, cityId);
        return cityId;
      }

      return null;
    } catch (error) {
      console.error('Error checking cities:', error);
      return null;
    }
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

  private parseDate(dateStr: string): Date | null {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr);
    }
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return null;
  }

  private formatDateDisplay(dateStr: string): string {
    const date = this.parseDate(dateStr);
    if (!date) return dateStr;

    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const months = [
      'янв',
      'фев',
      'мар',
      'апр',
      'май',
      'июн',
      'июл',
      'авг',
      'сен',
      'окт',
      'ноя',
      'дек',
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];

    return `${dayName}, ${day} ${month}`;
  }

  private formatAreaDisplay(area?: string): string {
    if (!area) return 'не важно';
    switch (area) {
      case 'center':
        return 'Центр';
      case 'midpoint':
        return 'Середина';
      default:
        return area;
    }
  }

  private formatBudgetDisplay(budget?: string): string {
    if (!budget) return 'любой';
    switch (budget) {
      case '$':
        return 'Эконом';
      case '$$':
        return 'Средний';
      case '$$$':
        return 'Дорого';
      default:
        return budget;
    }
  }

  private formatFormatDisplay(format?: string): string {
    if (!format) return 'любой';
    switch (format) {
      case 'dinner':
        return 'Ужин';
      case 'cafe':
        return 'Кафе';
      case 'bar':
        return 'Бар';
      default:
        return format;
    }
  }
}
