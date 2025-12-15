import { Telegraf, Context } from 'telegraf';
import { ApiClientService } from './services/api-client.service';
import { StateService } from './services/state.service';
import { StartHandler } from './handlers/start.handler';
import { SearchHandler } from './handlers/search.handler';
import { VenueHandler } from './handlers/venue.handler';
import { SavedHandler } from './handlers/saved.handler';
import { PlanHandler } from './handlers/plan.handler';

export class BotModule {
  private readonly apiClient: ApiClientService;
  private readonly stateService: StateService;
  private readonly startHandler: StartHandler;
  private readonly searchHandler: SearchHandler;
  private readonly venueHandler: VenueHandler;
  private readonly savedHandler: SavedHandler;
  private readonly planHandler: PlanHandler;

  constructor(private readonly bot: Telegraf) {
    this.apiClient = new ApiClientService();
    this.stateService = new StateService();
    this.startHandler = new StartHandler(this.apiClient, this.stateService);
    this.searchHandler = new SearchHandler(this.apiClient, this.stateService);
    this.venueHandler = new VenueHandler(this.apiClient, this.stateService);
    this.savedHandler = new SavedHandler(this.apiClient);
    this.planHandler = new PlanHandler(this.apiClient, this.stateService);
  }

  registerHandlers() {
    // Start command
    this.bot.start((ctx) => this.startHandler.handle(ctx));

    // City selection callback
    this.bot.action(/^city:(.+)$/, async (ctx) => {
      const cityId = ctx.match[1];
      await this.startHandler.handleCitySelection(ctx, cityId);
      await ctx.answerCbQuery();
    });

    // Category selection
    this.bot.action(/^category:(.+)$/, async (ctx) => {
      const category = ctx.match[1];
      await this.searchHandler.handleCategory(ctx, category);
      await ctx.answerCbQuery();
    });

    // Search prompt
    this.bot.action('search', async (ctx) => {
      await this.searchHandler.handleSearchPrompt(ctx);
      await ctx.answerCbQuery();
    });

    // Text message handler - handles search queries and plan creation input
    this.bot.on('text', async (ctx) => {
      // Skip if it's a command
      if (ctx.message.text.startsWith('/')) {
        return;
      }

      const userId = ctx.from?.id.toString() || '';
      const chatId = ctx.chat?.id;

      // Check if waiting for plan input
      const waitingForPlanInput = (this.stateService as any).waitingForPlanInput;
      if (waitingForPlanInput && chatId) {
        const waitingType = waitingForPlanInput.get(`${chatId}:${userId}`);
        if (waitingType === 'date') {
          // Try to parse date from text
          const dateStr = ctx.message.text;
          const date = this.planHandler['parseDate'](dateStr);
          if (date) {
            const dateFormatted = date.toISOString().split('T')[0];
            await this.planHandler.handleDateSelection(ctx, dateFormatted);
            waitingForPlanInput.delete(`${chatId}:${userId}`);
            return;
          }
        } else if (waitingType === 'time') {
          // Try to parse time from text (HH:MM format)
          const timeStr = ctx.message.text;
          if (/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr)) {
            await this.planHandler.handleTimeSelection(ctx, timeStr);
            waitingForPlanInput.delete(`${chatId}:${userId}`);
            return;
          }
        }
      }

      // Handle as search query if in search mode
      const state = this.stateService.getUserState(userId);
      if (state.searchQuery === '' || (state.cityId && !state.currentCategory)) {
        await this.searchHandler.handleSearchQuery(ctx, ctx.message.text);
      }
    });

    // Venue view
    this.bot.action(/^venue:(.+)$/, async (ctx) => {
      const venueId = ctx.match[1];
      await this.venueHandler.handleVenueView(ctx, venueId);
      await ctx.answerCbQuery();
    });

    // Save venue
    this.bot.action(/^save:(.+)$/, async (ctx) => {
      const venueId = ctx.match[1];
      await this.venueHandler.handleSaveVenue(ctx, venueId);
    });

    // Route
    this.bot.action(/^route:(.+)$/, async (ctx) => {
      const venueId = ctx.match[1];
      await this.venueHandler.handleRoute(ctx, venueId);
      await ctx.answerCbQuery();
    });

    // Share
    this.bot.action(/^share:(.+)$/, async (ctx) => {
      const venueId = ctx.match[1];
      await this.venueHandler.handleShare(ctx, venueId);
      await ctx.answerCbQuery();
    });

    // Back to categories
    this.bot.action('back:categories', async (ctx) => {
      const userId = ctx.from?.id.toString() || '';
      this.stateService.updateUserState(userId, {
        currentCategory: undefined,
        searchQuery: undefined,
        currentPage: undefined,
      });

      await ctx.reply('Что хочешь?', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🍽️ Еда', callback_data: 'category:restaurant' }],
            [{ text: '☕ Кофе', callback_data: 'category:cafe' }],
            [{ text: '🍺 Бар', callback_data: 'category:bar' }],
            [{ text: '🔍 Поиск', callback_data: 'search' }],
          ],
        },
      });
      await ctx.answerCbQuery();
    });

    // Back to list
    this.bot.action('back:list', async (ctx) => {
      const userId = ctx.from?.id.toString() || '';
      const state = this.stateService.getUserState(userId);

      if (state.currentCategory) {
        await this.searchHandler.handleCategory(ctx, state.currentCategory);
      } else if (state.searchQuery) {
        await this.searchHandler.handleSearchQuery(ctx, state.searchQuery);
      } else {
        await ctx.reply('Выберите категорию или поиск.');
      }
      await ctx.answerCbQuery();
    });

    // Saved venues command
    this.bot.command('saved', async (ctx) => {
      await this.savedHandler.handleSavedList(ctx);
    });

    // Plan command
    this.bot.command('plan', async (ctx) => {
      await this.planHandler.handlePlanCommand(ctx);
    });

    // Plan creation callbacks
    this.bot.action(/^plan:date:(.+)$/, async (ctx) => {
      const date = ctx.match[1];
      await this.planHandler.handleDateSelection(ctx, date);
    });

    this.bot.action(/^plan:time:(.+)$/, async (ctx) => {
      const time = ctx.match[1];
      await this.planHandler.handleTimeSelection(ctx, time);
    });

    this.bot.action(/^plan:area:(.+)$/, async (ctx) => {
      const area = ctx.match[1];
      await this.planHandler.handleAreaSelection(ctx, area);
    });

    this.bot.action(/^plan:budget:(.+)$/, async (ctx) => {
      const budget = ctx.match[1];
      await this.planHandler.handleBudgetSelection(ctx, budget);
    });

    this.bot.action(/^plan:format:(.+)$/, async (ctx) => {
      const format = ctx.match[1];
      await this.planHandler.handleFormatSelection(ctx, format);
    });

    this.bot.action('plan:cancel', async (ctx) => {
      await this.planHandler.handleCancel(ctx);
    });

    // Plan join
    this.bot.action(/^plan:join:(.+)$/, async (ctx) => {
      const planId = ctx.match[1];
      await this.planHandler.handleJoinPlan(ctx, planId);
    });

    this.bot.action(/^plan:join:confirm:(.+)$/, async (ctx) => {
      const planId = ctx.match[1];
      await this.planHandler.handleJoinConfirm(ctx, planId);
    });

    // Plan options
    this.bot.action(/^plan:options:(.+)$/, async (ctx) => {
      const planId = ctx.match[1];
      await this.planHandler.handleShowOptions(ctx, planId);
    });

    // Plan vote
    this.bot.action(/^plan:vote:(.+):(.+)$/, async (ctx) => {
      const planId = ctx.match[1];
      const venueId = ctx.match[2];
      await this.planHandler.handleVote(ctx, planId, venueId);
    });

    // Plan close
    this.bot.action(/^plan:close:(.+)$/, async (ctx) => {
      const planId = ctx.match[1];
      await this.planHandler.handleClosePlan(ctx, planId);
    });
  }
}
