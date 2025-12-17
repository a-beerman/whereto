import { Telegraf } from 'telegraf';
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
    // ============ Group Welcome ============

    // When bot is added to a group - send welcome message
    this.bot.on('my_chat_member', async (ctx) => {
      const update = ctx.myChatMember;
      const newStatus = update.new_chat_member.status;
      const chat = update.chat;

      if (
        (chat.type === 'group' || chat.type === 'supergroup') &&
        (newStatus === 'member' || newStatus === 'administrator')
      ) {
        await ctx.telegram.sendMessage(
          chat.id,
          `👋 Привет! Я *WhereTo Bot* — помогу выбрать место для встречи!

Нажми кнопку ниже, чтобы создать план:`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '📅 Создать план встречи', callback_data: 'start_plan' }],
                [{ text: '❓ Помощь', callback_data: 'show_help' }],
              ],
            },
          },
        );
      }
    });

    // Start plan from button
    this.bot.action('start_plan', async (ctx) => {
      await this.planHandler.handlePlanCommand(ctx);
      await ctx.answerCbQuery();
    });

    // Show help from button
    this.bot.action('show_help', async (ctx) => {
      await ctx.reply(
        `🤖 *Как пользоваться в группе:*

1. Нажми "📅 Создать план встречи"
2. Бот напишет тебе в личку
3. Выбери дату, время, район, бюджет
4. Бот отправит опрос в группу
5. Голосуйте в опросе
6. Бот выберет победителя! 🏆

_Каждый участник должен сначала выбрать город в личном чате с ботом (/start)_`,
        { parse_mode: 'Markdown' },
      );
      await ctx.answerCbQuery();
    });

    // Listen for trigger words in groups
    this.bot.hears(/^(план|plan|куда|где|встреча)$/i, async (ctx) => {
      if (ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup') {
        await ctx.reply('Что делаем?', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📅 Создать план встречи', callback_data: 'start_plan' }],
              [{ text: '🔍 Найти место', callback_data: 'search_prompt' }],
            ],
          },
        });
      }
    });

    // Search prompt from group
    this.bot.action('search_prompt', async (ctx) => {
      await ctx.reply(
        'Чтобы искать места, напиши мне в личку:\n👉 @' +
          (ctx.botInfo?.username || 'wheretovenue_bot'),
      );
      await ctx.answerCbQuery();
    });

    // ============ Start Command ============

    this.bot.start(async (ctx) => {
      const startPayload = ctx.startPayload;

      // Check if this is a redirect from group for plan creation
      if (startPayload && startPayload.startsWith('plan_')) {
        const groupChatId = startPayload.replace('plan_', '');
        await this.planHandler.handleStartWithPlan(ctx, groupChatId);
        return;
      }

      // Normal start
      await this.startHandler.handle(ctx);
    });

    // ============ Basic Commands ============

    this.bot.command('help', async (ctx) => {
      const helpText = `
🤖 *WhereTo Bot* — найди место для встречи!

*Команды:*
/start — выбрать город и начать поиск
/plan — создать план встречи (работает в группах)
/saved — посмотреть сохранённые места

*Как искать:*
1. Выбери город через /start
2. Выбери категорию (🍽️ Еда, ☕ Кофе, 🍺 Бар)
3. Или напиши запрос (пицца, суши, вино...)

*Как планировать в группе:*
1. Добавь бота в групповой чат
2. Нажми "📅 Создать план встречи"
3. Выбери параметры в личном чате
4. Голосуйте в опросе
5. Бот объявит победителя! 🏆
      `.trim();

      await ctx.reply(helpText, { parse_mode: 'Markdown' });
    });

    this.bot.command('saved', async (ctx) => {
      await this.savedHandler.handleSavedList(ctx);
    });

    this.bot.command('plan', async (ctx) => {
      await this.planHandler.handlePlanCommand(ctx);
    });

    // ============ City Selection ============

    this.bot.action(/^city:(.+)$/, async (ctx) => {
      const cityId = ctx.match[1];
      await this.startHandler.handleCitySelection(ctx, cityId);
      await ctx.answerCbQuery();
    });

    // ============ Search & Categories ============

    this.bot.action(/^category:(.+)$/, async (ctx) => {
      const category = ctx.match[1];
      await this.searchHandler.handleCategory(ctx, category);
      await ctx.answerCbQuery();
    });

    this.bot.action('search', async (ctx) => {
      await this.searchHandler.handleSearchPrompt(ctx);
      await ctx.answerCbQuery();
    });

    // ============ Venue Actions ============

    this.bot.action(/^venue:(.+)$/, async (ctx) => {
      const venueId = ctx.match[1];
      await this.venueHandler.handleVenueView(ctx, venueId);
      await ctx.answerCbQuery();
    });

    this.bot.action(/^save:(.+)$/, async (ctx) => {
      const venueId = ctx.match[1];
      await this.venueHandler.handleSaveVenue(ctx, venueId);
    });

    this.bot.action(/^route:(.+)$/, async (ctx) => {
      const venueId = ctx.match[1];
      await this.venueHandler.handleRoute(ctx, venueId);
      await ctx.answerCbQuery();
    });

    this.bot.action(/^share:(.+)$/, async (ctx) => {
      const venueId = ctx.match[1];
      await this.venueHandler.handleShare(ctx, venueId);
      await ctx.answerCbQuery();
    });

    // ============ Navigation ============

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

    // ============ Plan Creation (DM Flow) ============

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
      await this.planHandler.handleFormatSelection(ctx, format, this.bot);
    });

    this.bot.action('plan:cancel', async (ctx) => {
      await this.planHandler.handleCancel(ctx);
    });

    // ============ Plan Actions (Group - Short Callbacks) ============

    // Join plan: pj:<shortPlanId>
    this.bot.action(/^pj:(.+)$/, async (ctx) => {
      const shortPlanId = ctx.match[1];
      await this.planHandler.handleJoinPlan(ctx, shortPlanId);
    });

    // Show options / start poll: po:<shortPlanId>
    this.bot.action(/^po:(.+)$/, async (ctx) => {
      const shortPlanId = ctx.match[1];
      await this.planHandler.handleShowOptions(ctx, shortPlanId, this.bot);
    });

    // Rotate to next 5 venues: pr:<shortPlanId>
    this.bot.action(/^pr:(.+)$/, async (ctx) => {
      const shortPlanId = ctx.match[1];
      await this.planHandler.handleRotateVenues(ctx, shortPlanId, this.bot);
    });

    // Close plan / stop poll: px:<shortPlanId>
    this.bot.action(/^px:(.+)$/, async (ctx) => {
      const shortPlanId = ctx.match[1];
      await this.planHandler.handleClosePlan(ctx, shortPlanId, this.bot);
    });

    // Booking request: book:<shortPlanId>
    this.bot.action(/^book:(.+)$/, async (ctx) => {
      const shortPlanId = ctx.match[1];
      await this.planHandler.handleBookingRequest(ctx, shortPlanId);
    });

    // ============ Poll Answer Handler ============

    this.bot.on('poll_answer', async (ctx) => {
      const pollAnswer = ctx.pollAnswer;
      const user = pollAnswer.user;
      if (!user) return; // Anonymous poll answer

      const userId = user.id.toString();
      // Convert poll ID to string for consistent handling
      const pollId = String(pollAnswer.poll_id);
      const optionIds = pollAnswer.option_ids;

      // Handle single choice poll answer
      // For single choice, optionIds contains at most one element
      if (optionIds.length > 0) {
        // User selected an option (or changed selection)
        const optionIndex = optionIds[0];
        await this.planHandler.handlePollAnswerSingle(userId, pollId, optionIndex);
      } else {
        // User removed their vote
        await this.planHandler.handlePollAnswerRemoved(userId, pollId);
      }
    });

    // ============ Text Message Handler ============

    this.bot.on('text', async (ctx) => {
      const text = ctx.message.text;
      const botUsername = ctx.botInfo?.username?.toLowerCase() || '';

      // Handle commands with @botname (e.g., /plan@WhereTo_City_Bot)
      if (text.startsWith('/')) {
        const commandMatch = text.match(/^\/(\w+)(?:@(\w+))?/);
        if (commandMatch) {
          const command = commandMatch[1].toLowerCase();
          const mentionedBot = commandMatch[2]?.toLowerCase();

          if (!mentionedBot || mentionedBot === botUsername) {
            if (command === 'plan') {
              await this.planHandler.handlePlanCommand(ctx);
              return;
            }
            if (command === 'start') {
              await this.startHandler.handle(ctx);
              return;
            }
            if (command === 'saved') {
              await this.savedHandler.handleSavedList(ctx);
              return;
            }
          }
        }
        return;
      }

      // Handle search in private chat
      const userId = ctx.from?.id.toString() || '';
      const state = this.stateService.getUserState(userId);

      if (ctx.chat?.type === 'private' && state.cityId) {
        // Check if user is in search mode
        if (state.searchQuery === '' || !state.currentCategory) {
          await this.searchHandler.handleSearchQuery(ctx, text);
        }
      }
    });
  }
}
