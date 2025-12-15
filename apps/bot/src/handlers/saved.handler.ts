import { Context } from 'telegraf';
import { ApiClientService } from '../services/api-client.service';
import { formatVenueList } from '../utils/formatters';

export class SavedHandler {
  constructor(private readonly apiClient: ApiClientService) {}

  async handleSavedList(ctx: Context) {
    try {
      const userId = ctx.from?.id.toString() || '';

      const response = await this.apiClient.getSavedVenues(userId, 50, 0);
      const venues = response.data || [];

      if (venues.length === 0) {
        await ctx.reply('У тебя пока нет сохранённых мест.');
        return;
      }

      const venueList = venues
        .slice(0, 10)
        .map((venue: any, index: number) => formatVenueList(venue, index))
        .join('\n\n');

      const venueButtons = venues.slice(0, 10).map((venue: any) => [
        {
          text: `${venue.name} ${venue.rating ? `⭐ ${venue.rating}` : ''}`,
          callback_data: `venue:${venue.id}`,
        },
      ]);

      await ctx.reply(`Твои сохранённые места:\n\n${venueList}`, {
        reply_markup: {
          inline_keyboard: [
            ...venueButtons,
            [{ text: '⬅️ Назад', callback_data: 'back:categories' }],
          ],
        },
        parse_mode: 'Markdown',
      });
    } catch (error) {
      console.error('Error loading saved venues:', error);
      await ctx.reply('Произошла ошибка при загрузке сохранённых мест.');
    }
  }
}
