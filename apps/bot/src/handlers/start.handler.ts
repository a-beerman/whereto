import { Context } from 'telegraf';
import { ApiClientService } from '../services/api-client.service';
import { StateService } from '../services/state.service';
import { getCityKeyboard } from '../utils/keyboards';

export class StartHandler {
  constructor(
    private readonly apiClient: ApiClientService,
    private readonly stateService: StateService,
  ) {}

  async handle(ctx: Context) {
    try {
      const userId = ctx.from?.id.toString() || '';

      // Get available cities
      const citiesResponse = await this.apiClient.getCities();
      const cities = citiesResponse.data || [];

      if (cities.length === 0) {
        await ctx.reply('Извините, пока нет доступных городов.');
        return;
      }

      // Filter to cities with required fields and map to keyboard format
      const validCities = cities
        .filter((c) => c.id && c.name)
        .map((c) => ({ id: c.id!, name: c.name! }));

      // If only one city available, auto-select it
      if (validCities.length === 1) {
        await this.handleCitySelection(ctx, validCities[0].id);
        return;
      }

      await ctx.reply('Привет! В каком городе ищем места?', {
        reply_markup: getCityKeyboard(validCities),
        parse_mode: 'Markdown',
      });
    } catch (error) {
      console.error('Error in start handler:', error);
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  }

  async handleCitySelection(ctx: Context, cityId: string) {
    try {
      const userId = ctx.from?.id.toString() || '';
      this.stateService.setCity(userId, cityId);

      const cityResponse = await this.apiClient.getCity(cityId);
      const city = cityResponse.data;

      await ctx.reply(`Отлично! Выбран город: ${city.name}\n\nЧто хочешь?`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🍽️ Еда', callback_data: 'category:restaurant' }],
            [{ text: '☕ Кофе', callback_data: 'category:cafe' }],
            [{ text: '🍺 Бар', callback_data: 'category:bar' }],
            [{ text: '🔍 Поиск', callback_data: 'search' }],
          ],
        },
        parse_mode: 'Markdown',
      });
    } catch (error) {
      console.error('Error in city selection:', error);
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  }
}
