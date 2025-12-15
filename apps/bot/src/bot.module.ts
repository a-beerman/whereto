import { Telegraf, Context } from 'telegraf';
import { ApiClientService } from './services/api-client.service';
import { StateService } from './services/state.service';
import { StartHandler } from './handlers/start.handler';
import { SearchHandler } from './handlers/search.handler';
import { VenueHandler } from './handlers/venue.handler';
import { SavedHandler } from './handlers/saved.handler';

export class BotModule {
  private readonly apiClient: ApiClientService;
  private readonly stateService: StateService;
  private readonly startHandler: StartHandler;
  private readonly searchHandler: SearchHandler;
  private readonly venueHandler: VenueHandler;
  private readonly savedHandler: SavedHandler;

  constructor(private readonly bot: Telegraf) {
    this.apiClient = new ApiClientService();
    this.stateService = new StateService();
    this.startHandler = new StartHandler(this.apiClient, this.stateService);
    this.searchHandler = new SearchHandler(this.apiClient, this.stateService);
    this.venueHandler = new VenueHandler(this.apiClient, this.stateService);
    this.savedHandler = new SavedHandler(this.apiClient);
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

    // Search query (text message) - only if user clicked search button
    this.bot.on('text', async (ctx) => {
      // Skip if it's a command
      if (ctx.message.text.startsWith('/')) {
        return;
      }

      const userId = ctx.from?.id.toString() || '';
      const state = this.stateService.getUserState(userId);

      // Only handle as search if user is waiting for search input
      // We track this by checking if searchQuery is set to empty string (waiting for input)
      // or if user just clicked search button
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
  }
}
