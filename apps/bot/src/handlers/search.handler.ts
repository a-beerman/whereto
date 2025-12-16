import { Context } from 'telegraf';
import { ApiClientService } from '../services/api-client.service';
import { StateService } from '../services/state.service';
import { getVenueListKeyboard, getBackKeyboard } from '../utils/keyboards';
import { formatVenueList, formatVenueListItem } from '../utils/formatters';

export class SearchHandler {
  constructor(
    private readonly apiClient: ApiClientService,
    private readonly stateService: StateService,
  ) {}

  async handleSearchPrompt(ctx: Context) {
    try {
      const userId = ctx.from?.id.toString() || '';
      // Set searchQuery to empty string to indicate we're waiting for input
      this.stateService.updateUserState(userId, { searchQuery: '' });

      await ctx.reply('Напиши запрос (например: «кофе», «пицца», «вино», «центр»).', {
        reply_markup: getBackKeyboard(),
        parse_mode: 'Markdown',
      });
    } catch (error) {
      console.error('Error in search prompt:', error);
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  }

  async handleSearchQuery(ctx: Context, query: string) {
    try {
      const userId = ctx.from?.id.toString() || '';
      const state = this.stateService.getUserState(userId);

      if (!state.cityId) {
        await ctx.reply('Сначала выберите город.');
        return;
      }

      this.stateService.setSearchQuery(userId, query);

      const response = await this.apiClient.searchVenues({
        cityId: state.cityId,
        q: query,
        limit: 10,
        offset: 0,
      });

      const venues = response.data || [];

      if (venues.length === 0) {
        await ctx.reply('Ничего не нашёл по запросу. Попробуй другое слово или выбери категорию.', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🍽️ Еда', callback_data: 'category:restaurant' }],
              [{ text: '☕ Кофе', callback_data: 'category:cafe' }],
              [{ text: '🍺 Бар', callback_data: 'category:bar' }],
            ],
          },
        });
        return;
      }

      // Store venues in state for pagination
      this.stateService.updateUserState(userId, { currentPage: 0 });

      // Display venues with photos
      await this.displayVenueList(ctx, venues.slice(0, 5), venues.length >= 10);
    } catch (error) {
      console.error('Error in search query:', error);
      await ctx.reply('Произошла ошибка при поиске. Попробуйте позже.');
    }
  }

  async handleCategory(ctx: Context, category: string) {
    try {
      const userId = ctx.from?.id.toString() || '';
      const state = this.stateService.getUserState(userId);

      if (!state.cityId) {
        await ctx.reply('Сначала выберите город.');
        return;
      }

      this.stateService.setCategory(userId, category);

      const response = await this.apiClient.searchVenues({
        cityId: state.cityId,
        category,
        limit: 10,
        offset: 0,
      });

      const venues = response.data || [];

      if (venues.length === 0) {
        await ctx.reply('Не нашёл заведений в этой категории.');
        return;
      }

      // Store venues in state for pagination
      this.stateService.updateUserState(userId, { currentPage: 0 });

      // Display venues with photos
      await this.displayVenueList(ctx, venues.slice(0, 5), venues.length >= 10);
    } catch (error) {
      console.error('Error in category search:', error);
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  }

  /**
   * Display venue list with photo cards
   */
  private async displayVenueList(ctx: Context, venues: any[], hasMore: boolean) {
    // Send each venue as a photo card with inline button
    for (const venue of venues) {
      const photoUrl = venue.photoUrls?.[0] || venue.photoRefs?.[0];
      const caption = formatVenueListItem(venue);
      const keyboard = {
        inline_keyboard: [
          [{ text: `${venue.name} ⭐ ${venue.rating || '-'}`, callback_data: `venue:${venue.id}` }],
        ],
      };

      if (photoUrl && photoUrl.startsWith('http')) {
        try {
          await ctx.replyWithPhoto(photoUrl, {
            caption,
            parse_mode: 'Markdown',
            reply_markup: keyboard,
          });
        } catch (photoError) {
          // Fallback to text if photo fails
          await ctx.reply(caption, {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
          });
        }
      } else {
        // No photo - text only
        await ctx.reply(caption, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Send navigation keyboard
    const navKeyboard = {
      inline_keyboard: [
        ...(hasMore ? [[{ text: 'Вперёд ➡️', callback_data: 'page:1' }]] : []),
        [{ text: '⬅️ Назад к категориям', callback_data: 'back:categories' }],
      ],
    };

    await ctx.reply('Выбери заведение или листай дальше ⬆️', {
      reply_markup: navKeyboard,
    });
  }
}
